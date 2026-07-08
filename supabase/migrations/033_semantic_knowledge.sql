-- =============================================================================
-- 033 — Enterprise Semantic RAG Knowledge Base
-- Vector embeddings, document versioning, outlet-aware retrieval
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- Document categories (reference)
-- ---------------------------------------------------------------------------
-- restaurant_policies, faqs, catering, private_parties, events, festival_info,
-- brand_story, press_releases, awards, training, future_menu

-- ---------------------------------------------------------------------------
-- semantic_documents — master record per uploaded knowledge document
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.semantic_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  location_id TEXT,
  visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'private')),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL
    CHECK (file_type IN ('pdf', 'docx', 'txt', 'markdown', 'html', 'csv')),
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  current_version INT NOT NULL DEFAULT 1,
  index_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (index_status IN ('pending', 'processing', 'indexed', 'failed', 'stale')),
  index_error TEXT,
  chunk_count INT NOT NULL DEFAULT 0,
  token_estimate INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_semantic_documents_category
  ON public.semantic_documents (category);
CREATE INDEX IF NOT EXISTS idx_semantic_documents_location
  ON public.semantic_documents (location_id);
CREATE INDEX IF NOT EXISTS idx_semantic_documents_status
  ON public.semantic_documents (index_status);

-- ---------------------------------------------------------------------------
-- semantic_document_versions — version history per document
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.semantic_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.semantic_documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  extracted_text_preview TEXT,
  change_notes TEXT,
  chunk_count INT NOT NULL DEFAULT 0,
  indexed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_semantic_versions_document
  ON public.semantic_document_versions (document_id, version_number DESC);

-- ---------------------------------------------------------------------------
-- semantic_chunks — chunked text + embeddings for vector search
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.semantic_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.semantic_documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  location_id TEXT,
  category TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'private')),
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  token_estimate INT NOT NULL DEFAULT 0,
  embedding vector(768),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_semantic_chunks_document
  ON public.semantic_chunks (document_id, version_number, chunk_index);
CREATE INDEX IF NOT EXISTS idx_semantic_chunks_location
  ON public.semantic_chunks (location_id);
CREATE INDEX IF NOT EXISTS idx_semantic_chunks_category
  ON public.semantic_chunks (category);

CREATE INDEX IF NOT EXISTS idx_semantic_chunks_embedding
  ON public.semantic_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ---------------------------------------------------------------------------
-- semantic_index_jobs — background indexing queue
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.semantic_index_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.semantic_documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_semantic_index_jobs_status
  ON public.semantic_index_jobs (status, created_at);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.semantic_documents_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_semantic_documents_updated_at ON public.semantic_documents;
CREATE TRIGGER trg_semantic_documents_updated_at
  BEFORE UPDATE ON public.semantic_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.semantic_documents_set_updated_at();

-- ---------------------------------------------------------------------------
-- Vector similarity search (outlet-aware, visibility-filtered)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_semantic_chunks(
  query_embedding vector(768),
  match_count int DEFAULT 5,
  filter_location_id text DEFAULT NULL,
  filter_categories text[] DEFAULT NULL,
  min_similarity float DEFAULT 0.55
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  category text,
  location_id text,
  chunk_index int,
  similarity float,
  metadata jsonb
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    c.id,
    c.document_id,
    c.content,
    c.category,
    c.location_id,
    c.chunk_index,
    1 - (c.embedding <=> query_embedding) AS similarity,
    c.metadata
  FROM public.semantic_chunks c
  INNER JOIN public.semantic_documents d ON d.id = c.document_id
  WHERE c.embedding IS NOT NULL
    AND d.index_status = 'indexed'
    AND c.visibility = 'public'
    AND d.visibility = 'public'
    AND d.current_version = c.version_number
    AND (
      c.location_id IS NULL
      OR filter_location_id IS NULL
      OR c.location_id = filter_location_id
    )
    AND (
      filter_categories IS NULL
      OR c.category = ANY(filter_categories)
    )
    AND (1 - (c.embedding <=> query_embedding)) >= min_similarity
  ORDER BY c.embedding <=> query_embedding
  LIMIT GREATEST(match_count, 1);
$$;

-- ---------------------------------------------------------------------------
-- RLS — admin-only document management; chunks not exposed to anon
-- ---------------------------------------------------------------------------
ALTER TABLE public.semantic_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semantic_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semantic_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semantic_index_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "semantic_documents_admin_select"
  ON public.semantic_documents FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "semantic_documents_admin_insert"
  ON public.semantic_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "semantic_documents_admin_update"
  ON public.semantic_documents FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "semantic_documents_admin_delete"
  ON public.semantic_documents FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "semantic_versions_admin_all"
  ON public.semantic_document_versions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "semantic_chunks_admin_select"
  ON public.semantic_chunks FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "semantic_index_jobs_admin_select"
  ON public.semantic_index_jobs FOR SELECT TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage bucket — private knowledge documents (admin upload only)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'semantic-knowledge',
  'semantic-knowledge',
  FALSE,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/html',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "semantic_knowledge_admin_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'semantic-knowledge' AND public.is_admin());

CREATE POLICY "semantic_knowledge_admin_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'semantic-knowledge' AND public.is_admin());

CREATE POLICY "semantic_knowledge_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'semantic-knowledge' AND public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "semantic_knowledge_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'semantic-knowledge' AND public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed feature flag for semantic RAG (optional runtime gate)
-- ---------------------------------------------------------------------------
INSERT INTO public.ai_feature_flags (key, enabled, config)
VALUES ('semantic_rag', TRUE, '{"description":"Enterprise semantic document retrieval for Cheffy"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
