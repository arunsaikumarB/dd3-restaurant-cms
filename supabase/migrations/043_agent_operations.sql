-- =============================================================================
-- 043 — Enterprise AI Operations Center
-- Additive only. Does not redesign Planner / Tool Orchestrator / Reflection /
-- Semantic RAG / Gemini.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.agent_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text,
  location_id text,
  plan_id uuid,
  package_id text,
  reflection_id uuid,
  message_preview text,
  intent text,
  goal text,
  complexity text,
  status text NOT NULL DEFAULT 'completed',
  success boolean NOT NULL DEFAULT true,
  total_ms int NOT NULL DEFAULT 0,
  planner_ms int NOT NULL DEFAULT 0,
  tool_ms int NOT NULL DEFAULT 0,
  retrieval_ms int NOT NULL DEFAULT 0,
  aggregation_ms int NOT NULL DEFAULT 0,
  gemini_ms int NOT NULL DEFAULT 0,
  reflection_ms int NOT NULL DEFAULT 0,
  confidence numeric,
  confidence_band text,
  next_action text,
  needs_follow_up boolean NOT NULL DEFAULT false,
  needs_escalation boolean NOT NULL DEFAULT false,
  tool_success_count int NOT NULL DEFAULT 0,
  tool_failure_count int NOT NULL DEFAULT 0,
  workflow_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_workflows_created
  ON public.agent_workflows (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_workflows_conversation
  ON public.agent_workflows (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_workflows_intent
  ON public.agent_workflows (intent, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_workflows_location
  ON public.agent_workflows (location_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.agent_workflows(id) ON DELETE CASCADE,
  conversation_id text,
  event_type text NOT NULL,
  label text,
  status text NOT NULL DEFAULT 'ok',
  duration_ms int NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_timelines_workflow
  ON public.agent_timelines (workflow_id, occurred_at ASC);

CREATE TABLE IF NOT EXISTS public.agent_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.agent_workflows(id) ON DELETE SET NULL,
  location_id text,
  stage text NOT NULL,
  duration_ms int NOT NULL DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_performance_stage
  ON public.agent_performance (stage, recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_quality (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.agent_workflows(id) ON DELETE SET NULL,
  conversation_id text,
  location_id text,
  confidence numeric,
  reflection_score numeric,
  knowledge_coverage numeric,
  hallucination_risk numeric,
  completed boolean NOT NULL DEFAULT false,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_type text NOT NULL,
  title text NOT NULL,
  reason text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  location_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_recommendations_status
  ON public.agent_recommendations (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component text NOT NULL,
  health_score numeric NOT NULL DEFAULT 100,
  availability numeric NOT NULL DEFAULT 100,
  failure_rate numeric NOT NULL DEFAULT 0,
  avg_latency_ms int NOT NULL DEFAULT 0,
  warnings int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'healthy',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_health_component
  ON public.agent_health (component, recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  export_type text NOT NULL,
  format text NOT NULL DEFAULT 'json',
  actor_id uuid,
  location_id text,
  row_count int NOT NULL DEFAULT 0,
  payload_preview text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_quality ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_exports ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agent_workflows',
    'agent_timelines',
    'agent_performance',
    'agent_quality',
    'agent_recommendations',
    'agent_health',
    'agent_exports'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_authenticated_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t || '_authenticated_all', t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_anon_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO anon WITH CHECK (true)',
      t || '_anon_insert', t
    );
  END LOOP;
END $$;
