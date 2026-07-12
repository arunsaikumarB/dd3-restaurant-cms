-- =============================================================================
-- 042 — Reflection Layer (confidence, goals, escalations, clarifications)
-- Additive only. Does not redesign Planner / Tool Orchestrator / RAG / Gemini.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.agent_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text,
  location_id text,
  plan_id uuid,
  message_preview text,
  completed boolean NOT NULL DEFAULT false,
  confidence numeric NOT NULL DEFAULT 0,
  confidence_band text NOT NULL DEFAULT 'medium',
  needs_follow_up boolean NOT NULL DEFAULT false,
  needs_escalation boolean NOT NULL DEFAULT false,
  next_action text NOT NULL DEFAULT 'accept',
  reason text,
  reflection_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_reflections_created
  ON public.agent_reflections (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_reflections_band
  ON public.agent_reflections (confidence_band, created_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_confidence_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reflection_id uuid REFERENCES public.agent_reflections(id) ON DELETE CASCADE,
  confidence numeric NOT NULL,
  band text NOT NULL,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  location_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_goal_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reflection_id uuid REFERENCES public.agent_reflections(id) ON DELETE SET NULL,
  conversation_id text,
  goal text NOT NULL,
  progress_percent int NOT NULL DEFAULT 0,
  completed_fields text[] NOT NULL DEFAULT '{}',
  missing_fields text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reflection_id uuid REFERENCES public.agent_reflections(id) ON DELETE SET NULL,
  conversation_id text,
  recommended boolean NOT NULL DEFAULT true,
  reason text,
  priority text NOT NULL DEFAULT 'medium',
  department text,
  location_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_clarifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reflection_id uuid REFERENCES public.agent_reflections(id) ON DELETE SET NULL,
  conversation_id text,
  missing_fields text[] NOT NULL DEFAULT '{}',
  question text,
  location_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_reflection_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  confidence numeric,
  next_action text,
  escalated boolean NOT NULL DEFAULT false,
  clarified boolean NOT NULL DEFAULT false,
  location_id text,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_reflection_metrics_key
  ON public.agent_reflection_metrics (metric_key, recorded_at DESC);

ALTER TABLE public.agent_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_confidence_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_clarifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_reflection_metrics ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agent_reflections',
    'agent_confidence_scores',
    'agent_goal_progress',
    'agent_escalations',
    'agent_clarifications',
    'agent_reflection_metrics'
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
