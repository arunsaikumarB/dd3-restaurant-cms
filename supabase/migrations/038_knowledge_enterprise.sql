-- =============================================================================
-- 038 — Enterprise Knowledge Base extensions (OCR, language, duplicates,
--        approval workflow, health, activity, background jobs)
-- Extends 033_semantic_knowledge.sql — does NOT redesign existing tables.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Allow image file types on existing documents table
-- ---------------------------------------------------------------------------
ALTER TABLE public.semantic_documents
  DROP CONSTRAINT IF EXISTS semantic_documents_file_type_check;

ALTER TABLE public.semantic_documents
  ADD CONSTRAINT semantic_documents_file_type_check
  CHECK (file_type IN ('pdf', 'docx', 'txt', 'markdown', 'html', 'csv', 'jpeg', 'png', 'webp'));

ALTER TABLE public.semantic_document_versions
  DROP CONSTRAINT IF EXISTS semantic_document_versions_file_type_check;

-- versions table may not have named constraint — widen via check only if present
DO $$
BEGIN
  ALTER TABLE public.semantic_document_versions
    DROP CONSTRAINT IF EXISTS semantic_document_versions_file_type_check;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Extend semantic_documents with enterprise columns (backward compatible)
-- ---------------------------------------------------------------------------
ALTER TABLE public.semantic_documents
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS language_source text NOT NULL DEFAULT 'auto'
    CHECK (language_source IN ('auto', 'manual')),
  ADD COLUMN IF NOT EXISTS file_hash text,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'pending_review'
    CHECK (workflow_status IN (
      'draft', 'pending_review', 'approved', 'rejected', 'published', 'archived'
    )),
  ADD COLUMN IF NOT EXISTS ocr_status text NOT NULL DEFAULT 'not_needed'
    CHECK (ocr_status IN (
      'not_needed', 'pending', 'processing', 'completed', 'failed', 'skipped'
    )),
  ADD COLUMN IF NOT EXISTS ocr_confidence numeric,
  ADD COLUMN IF NOT EXISTS ocr_language text,
  ADD COLUMN IF NOT EXISTS ocr_duration_ms int,
  ADD COLUMN IF NOT EXISTS ocr_error text,
  ADD COLUMN IF NOT EXISTS ocr_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duplicate_of uuid REFERENCES public.semantic_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_duplicate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_retrieval_at timestamptz,
  ADD COLUMN IF NOT EXISTS retrieval_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS index_duration_ms int,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_reason text;

CREATE INDEX IF NOT EXISTS idx_semantic_documents_language
  ON public.semantic_documents (language);
CREATE INDEX IF NOT EXISTS idx_semantic_documents_workflow
  ON public.semantic_documents (workflow_status);
CREATE INDEX IF NOT EXISTS idx_semantic_documents_file_hash
  ON public.semantic_documents (file_hash);
CREATE INDEX IF NOT EXISTS idx_semantic_documents_ocr
  ON public.semantic_documents (ocr_status);

-- Existing indexed docs remain searchable: treat them as published.
UPDATE public.semantic_documents
SET workflow_status = 'published'
WHERE index_status = 'indexed'
  AND workflow_status = 'pending_review';

-- ---------------------------------------------------------------------------
-- knowledge_reviews — approval history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.semantic_documents(id) ON DELETE CASCADE,
  action text NOT NULL
    CHECK (action IN ('submit', 'approve', 'reject', 'publish', 'archive', 'reopen')),
  from_status text,
  to_status text NOT NULL,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  comments text,
  rejected_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_reviews_document
  ON public.knowledge_reviews (document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_reviews_action
  ON public.knowledge_reviews (action, created_at DESC);

-- ---------------------------------------------------------------------------
-- knowledge_duplicates — duplicate / near-duplicate report
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_duplicates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.semantic_documents(id) ON DELETE CASCADE,
  match_document_id uuid REFERENCES public.semantic_documents(id) ON DELETE SET NULL,
  match_chunk_id uuid,
  duplicate_type text NOT NULL
    CHECK (duplicate_type IN (
      'file_hash', 'content_hash', 'chunk_similarity', 'embedding_similarity', 'near_duplicate'
    )),
  similarity numeric,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'ignored', 'resolved', 'replaced')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_knowledge_duplicates_document
  ON public.knowledge_duplicates (document_id, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_duplicates_type
  ON public.knowledge_duplicates (duplicate_type, status);

-- ---------------------------------------------------------------------------
-- knowledge_activity — timeline of KB events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.semantic_documents(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  summary text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_activity_created
  ON public.knowledge_activity (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_activity_type
  ON public.knowledge_activity (event_type, created_at DESC);

-- ---------------------------------------------------------------------------
-- knowledge_jobs — async OCR / index / duplicate / health jobs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.semantic_documents(id) ON DELETE CASCADE,
  job_type text NOT NULL
    CHECK (job_type IN (
      'ocr', 'chunk', 'embed', 'index', 'duplicate_scan', 'reindex', 'health', 'language_detect'
    )),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  progress int NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error text,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_jobs_status
  ON public.knowledge_jobs (status, created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_jobs_document
  ON public.knowledge_jobs (document_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- knowledge_health — snapshot metrics for dashboard
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  health_score numeric NOT NULL DEFAULT 0,
  total_documents int NOT NULL DEFAULT 0,
  indexed_documents int NOT NULL DEFAULT 0,
  pending_documents int NOT NULL DEFAULT 0,
  failed_documents int NOT NULL DEFAULT 0,
  published_documents int NOT NULL DEFAULT 0,
  private_documents int NOT NULL DEFAULT 0,
  public_documents int NOT NULL DEFAULT 0,
  approval_pending int NOT NULL DEFAULT 0,
  duplicate_documents int NOT NULL DEFAULT 0,
  duplicate_chunks int NOT NULL DEFAULT 0,
  near_duplicates int NOT NULL DEFAULT 0,
  ocr_completed int NOT NULL DEFAULT 0,
  ocr_failed int NOT NULL DEFAULT 0,
  embedding_failures int NOT NULL DEFAULT 0,
  avg_chunk_count numeric NOT NULL DEFAULT 0,
  avg_token_estimate numeric NOT NULL DEFAULT 0,
  avg_similarity numeric NOT NULL DEFAULT 0,
  avg_index_duration_ms numeric NOT NULL DEFAULT 0,
  storage_bytes bigint NOT NULL DEFAULT 0,
  stale_documents int NOT NULL DEFAULT 0,
  need_reindex int NOT NULL DEFAULT 0,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_knowledge_health_snapshot
  ON public.knowledge_health (snapshot_at DESC);

-- ---------------------------------------------------------------------------
-- knowledge_metrics — time-series for charts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_metrics_key_time
  ON public.knowledge_metrics (metric_key, recorded_at DESC);

-- ---------------------------------------------------------------------------
-- Update match_semantic_chunks — only PUBLISHED + indexed documents
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
    AND d.workflow_status = 'published'
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
-- Health snapshot helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_knowledge_health()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  snapshot_id uuid;
  total_docs int;
  indexed_docs int;
  pending_docs int;
  failed_docs int;
  published_docs int;
  private_docs int;
  public_docs int;
  approval_pending int;
  dup_docs int;
  near_dups int;
  ocr_ok int;
  ocr_fail int;
  embed_fail int;
  avg_chunks numeric;
  avg_tokens numeric;
  avg_index_ms numeric;
  storage_sum bigint;
  stale_docs int;
  need_reindex int;
  score numeric;
BEGIN
  SELECT COUNT(*) INTO total_docs FROM public.semantic_documents;
  SELECT COUNT(*) INTO indexed_docs FROM public.semantic_documents WHERE index_status = 'indexed';
  SELECT COUNT(*) INTO pending_docs FROM public.semantic_documents WHERE index_status IN ('pending', 'processing');
  SELECT COUNT(*) INTO failed_docs FROM public.semantic_documents WHERE index_status = 'failed';
  SELECT COUNT(*) INTO published_docs FROM public.semantic_documents WHERE workflow_status = 'published';
  SELECT COUNT(*) INTO private_docs FROM public.semantic_documents WHERE visibility = 'private';
  SELECT COUNT(*) INTO public_docs FROM public.semantic_documents WHERE visibility = 'public';
  SELECT COUNT(*) INTO approval_pending FROM public.semantic_documents WHERE workflow_status = 'pending_review';
  SELECT COUNT(*) INTO dup_docs FROM public.semantic_documents WHERE is_duplicate = true;
  SELECT COUNT(*) INTO near_dups FROM public.knowledge_duplicates WHERE duplicate_type IN ('near_duplicate', 'embedding_similarity', 'chunk_similarity') AND status = 'open';
  SELECT COUNT(*) INTO ocr_ok FROM public.semantic_documents WHERE ocr_status = 'completed';
  SELECT COUNT(*) INTO ocr_fail FROM public.semantic_documents WHERE ocr_status = 'failed';
  SELECT COUNT(*) INTO embed_fail FROM public.semantic_documents WHERE index_status = 'failed' AND index_error ILIKE '%embed%';
  SELECT COALESCE(AVG(chunk_count), 0), COALESCE(AVG(token_estimate), 0), COALESCE(AVG(index_duration_ms), 0), COALESCE(SUM(file_size_bytes), 0)
    INTO avg_chunks, avg_tokens, avg_index_ms, storage_sum
    FROM public.semantic_documents;
  SELECT COUNT(*) INTO stale_docs FROM public.semantic_documents WHERE index_status = 'stale';
  SELECT COUNT(*) INTO need_reindex FROM public.semantic_documents WHERE index_status IN ('stale', 'failed');

  score := 100;
  IF total_docs > 0 THEN
    score := LEAST(100, GREATEST(0,
      (indexed_docs::numeric / total_docs) * 40
      + (published_docs::numeric / total_docs) * 25
      + (1 - LEAST(failed_docs::numeric / total_docs, 1)) * 15
      + (1 - LEAST(dup_docs::numeric / total_docs, 1)) * 10
      + (1 - LEAST(ocr_fail::numeric / GREATEST(ocr_ok + ocr_fail, 1), 1)) * 10
    ));
  END IF;

  INSERT INTO public.knowledge_health (
    health_score, total_documents, indexed_documents, pending_documents, failed_documents,
    published_documents, private_documents, public_documents, approval_pending,
    duplicate_documents, duplicate_chunks, near_duplicates, ocr_completed, ocr_failed,
    embedding_failures, avg_chunk_count, avg_token_estimate, avg_index_duration_ms,
    storage_bytes, stale_documents, need_reindex
  ) VALUES (
    ROUND(score, 1), total_docs, indexed_docs, pending_docs, failed_docs,
    published_docs, private_docs, public_docs, approval_pending,
    dup_docs, 0, near_dups, ocr_ok, ocr_fail,
    embed_fail, ROUND(avg_chunks, 1), ROUND(avg_tokens, 1), ROUND(avg_index_ms, 1),
    storage_sum, stale_docs, need_reindex
  )
  RETURNING id INTO snapshot_id;

  INSERT INTO public.knowledge_metrics (metric_key, metric_value, dimensions)
  VALUES
    ('health_score', ROUND(score, 1), '{}'::jsonb),
    ('total_documents', total_docs, '{}'::jsonb),
    ('indexed_documents', indexed_docs, '{}'::jsonb),
    ('ocr_success_rate', CASE WHEN (ocr_ok + ocr_fail) = 0 THEN 100 ELSE ROUND((ocr_ok::numeric / (ocr_ok + ocr_fail)) * 100, 1) END, '{}'::jsonb);

  RETURN snapshot_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS for new tables — admin only
-- ---------------------------------------------------------------------------
ALTER TABLE public.knowledge_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_duplicates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "knowledge_reviews_admin_all"
  ON public.knowledge_reviews FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "knowledge_duplicates_admin_all"
  ON public.knowledge_duplicates FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "knowledge_activity_admin_all"
  ON public.knowledge_activity FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "knowledge_jobs_admin_all"
  ON public.knowledge_jobs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "knowledge_health_admin_select"
  ON public.knowledge_health FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "knowledge_metrics_admin_select"
  ON public.knowledge_metrics FOR SELECT TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- Allow image uploads in semantic-knowledge bucket
-- ---------------------------------------------------------------------------
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg'
]
WHERE id = 'semantic-knowledge';
