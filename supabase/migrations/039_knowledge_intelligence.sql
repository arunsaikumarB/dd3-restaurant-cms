-- =============================================================================
-- 039 — AI Knowledge Intelligence & Observability
-- Additive only. Does NOT redesign Semantic RAG / 033 / 038 tables.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- knowledge_feedback — guest / admin feedback on Cheffy answers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text,
  session_id text,
  location_id text,
  question text NOT NULL,
  response text,
  feedback_type text NOT NULL
    CHECK (feedback_type IN (
      'helpful', 'not_helpful', 'incorrect', 'missing_information', 'needs_human'
    )),
  rating int CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  retrieved_chunks jsonb NOT NULL DEFAULT '[]'::jsonb,
  document_ids uuid[] NOT NULL DEFAULT '{}',
  chunk_ids uuid[] NOT NULL DEFAULT '{}',
  prompt_version text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_feedback_type
  ON public.knowledge_feedback (feedback_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_feedback_location
  ON public.knowledge_feedback (location_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_feedback_created
  ON public.knowledge_feedback (created_at DESC);

-- ---------------------------------------------------------------------------
-- knowledge_relationships — document graph edges
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id uuid NOT NULL REFERENCES public.semantic_documents(id) ON DELETE CASCADE,
  target_document_id uuid NOT NULL REFERENCES public.semantic_documents(id) ON DELETE CASCADE,
  relationship_type text NOT NULL
    CHECK (relationship_type IN (
      'parent', 'child', 'related', 'duplicate', 'supersedes', 'depends_on', 'see_also'
    )),
  weight numeric NOT NULL DEFAULT 1.0,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_relationships_no_self CHECK (source_document_id <> target_document_id),
  CONSTRAINT knowledge_relationships_unique UNIQUE (source_document_id, target_document_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_source
  ON public.knowledge_relationships (source_document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_target
  ON public.knowledge_relationships (target_document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_type
  ON public.knowledge_relationships (relationship_type);

-- ---------------------------------------------------------------------------
-- knowledge_validation — validation runs & findings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_validation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.semantic_documents(id) ON DELETE CASCADE,
  run_id uuid NOT NULL DEFAULT gen_random_uuid(),
  finding_type text NOT NULL
    CHECK (finding_type IN (
      'conflicting_prices', 'conflicting_policies', 'conflicting_dates',
      'duplicate_facts', 'missing_metadata', 'expired_document',
      'broken_relationship', 'empty_chunks', 'low_ocr_confidence',
      'low_embedding_quality', 'missing_category', 'other'
    )),
  severity text NOT NULL DEFAULT 'warning'
    CHECK (severity IN ('info', 'warning', 'error')),
  title text NOT NULL,
  details text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_score numeric,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'ignored', 'resolved', 'fixed')),
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_validation_status
  ON public.knowledge_validation (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_validation_run
  ON public.knowledge_validation (run_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_validation_document
  ON public.knowledge_validation (document_id);

-- ---------------------------------------------------------------------------
-- knowledge_cost — cost / usage metric samples
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_cost (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  cost_usd numeric NOT NULL DEFAULT 0,
  tokens_in int NOT NULL DEFAULT 0,
  tokens_out int NOT NULL DEFAULT 0,
  document_id uuid REFERENCES public.semantic_documents(id) ON DELETE SET NULL,
  category text,
  location_id text,
  period text NOT NULL DEFAULT 'event'
    CHECK (period IN ('event', 'daily', 'weekly', 'monthly')),
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_cost_key_time
  ON public.knowledge_cost (metric_key, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_cost_category
  ON public.knowledge_cost (category, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_cost_location
  ON public.knowledge_cost (location_id, recorded_at DESC);

-- ---------------------------------------------------------------------------
-- knowledge_debug — persisted debug / search-lab runs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_debug (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  location_id text,
  stages jsonb NOT NULL DEFAULT '[]'::jsonb,
  retrieved_chunks jsonb NOT NULL DEFAULT '[]'::jsonb,
  prompt_preview text,
  response_preview text,
  timings jsonb NOT NULL DEFAULT '{}'::jsonb,
  token_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  lab_options jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_debug_created
  ON public.knowledge_debug (created_at DESC);

-- ---------------------------------------------------------------------------
-- knowledge_quality — quality score snapshots
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_quality (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  overall_score numeric NOT NULL DEFAULT 0,
  retrieval_accuracy numeric NOT NULL DEFAULT 0,
  chunk_quality numeric NOT NULL DEFAULT 0,
  avg_similarity numeric NOT NULL DEFAULT 0,
  hallucination_risk numeric NOT NULL DEFAULT 0,
  knowledge_coverage numeric NOT NULL DEFAULT 0,
  knowledge_freshness numeric NOT NULL DEFAULT 0,
  approval_compliance numeric NOT NULL DEFAULT 0,
  feedback_score numeric NOT NULL DEFAULT 0,
  avg_response_rating numeric NOT NULL DEFAULT 0,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_knowledge_quality_snapshot
  ON public.knowledge_quality (snapshot_at DESC);

-- ---------------------------------------------------------------------------
-- knowledge_recommendations — improvement suggestions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_type text NOT NULL
    CHECK (recommendation_type IN (
      'upload_faq', 'upload_policy', 'split_document', 'merge_duplicates',
      'reindex', 'improve_metadata', 'improve_categories', 'create_relationship',
      'update_expired', 'other'
    )),
  title text NOT NULL,
  rationale text NOT NULL,
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  document_id uuid REFERENCES public.semantic_documents(id) ON DELETE SET NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'accepted', 'dismissed', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_recommendations_status
  ON public.knowledge_recommendations (status, priority, created_at DESC);

-- ---------------------------------------------------------------------------
-- knowledge_audit — immutable audit trail for intelligence events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity_type text,
  entity_id text,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  summary text NOT NULL,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_audit_created
  ON public.knowledge_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_audit_event
  ON public.knowledge_audit (event_type, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS — admin authenticated access (matches prior knowledge tables pattern)
-- ---------------------------------------------------------------------------
ALTER TABLE public.knowledge_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_validation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_cost ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_debug ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_quality ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_audit ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'knowledge_feedback',
    'knowledge_relationships',
    'knowledge_validation',
    'knowledge_cost',
    'knowledge_debug',
    'knowledge_quality',
    'knowledge_recommendations',
    'knowledge_audit'
  ]
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      t || '_authenticated_all',
      t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t || '_authenticated_all',
      t
    );
  END LOOP;
END $$;

-- Anonymous insert for guest feedback only (no select)
DROP POLICY IF EXISTS knowledge_feedback_anon_insert ON public.knowledge_feedback;
CREATE POLICY knowledge_feedback_anon_insert
  ON public.knowledge_feedback
  FOR INSERT
  TO anon
  WITH CHECK (true);
