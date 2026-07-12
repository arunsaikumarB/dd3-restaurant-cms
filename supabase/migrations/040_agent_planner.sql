-- =============================================================================
-- 040 — Agentic Planner tables (execution plans, goals, reasoning, metrics)
-- Additive only. Does not redesign Semantic RAG / tools / Gemini tables.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.agent_execution_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text,
  location_id text,
  message_preview text,
  intent text NOT NULL,
  secondary_intents text[] NOT NULL DEFAULT '{}',
  goal text NOT NULL,
  complexity text NOT NULL CHECK (complexity IN ('simple', 'medium', 'complex')),
  confidence numeric NOT NULL DEFAULT 0,
  plan_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  human_escalation boolean NOT NULL DEFAULT false,
  clarification_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_execution_plans_created
  ON public.agent_execution_plans (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_execution_plans_intent
  ON public.agent_execution_plans (intent, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_execution_plans_conversation
  ON public.agent_execution_plans (conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_reasoning_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.agent_execution_plans(id) ON DELETE CASCADE,
  conversation_id text,
  detected_intent text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0,
  complexity text NOT NULL,
  why_tools jsonb NOT NULL DEFAULT '[]'::jsonb,
  why_knowledge jsonb NOT NULL DEFAULT '[]'::jsonb,
  clarification_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  escalation_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  reasoning_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_reasoning_logs_plan
  ON public.agent_reasoning_logs (plan_id);
CREATE INDEX IF NOT EXISTS idx_agent_reasoning_logs_created
  ON public.agent_reasoning_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text,
  goal text NOT NULL,
  progress_percent int NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  required_fields text[] NOT NULL DEFAULT '{}',
  collected_fields text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'abandoned', 'escalated')),
  plan_id uuid REFERENCES public.agent_execution_plans(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_goals_conversation
  ON public.agent_goals (conversation_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_goals_status
  ON public.agent_goals (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_planner_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  intent text,
  complexity text,
  confidence numeric,
  location_id text,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_planner_metrics_key
  ON public.agent_planner_metrics (metric_key, recorded_at DESC);

ALTER TABLE public.agent_execution_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_reasoning_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_planner_metrics ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agent_execution_plans',
    'agent_reasoning_logs',
    'agent_goals',
    'agent_planner_metrics'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_authenticated_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t || '_authenticated_all',
      t
    );
  END LOOP;
END $$;

-- Allow service / anon insert for guest conversation planning (no select for anon)
DROP POLICY IF EXISTS agent_execution_plans_anon_insert ON public.agent_execution_plans;
CREATE POLICY agent_execution_plans_anon_insert
  ON public.agent_execution_plans FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS agent_reasoning_logs_anon_insert ON public.agent_reasoning_logs;
CREATE POLICY agent_reasoning_logs_anon_insert
  ON public.agent_reasoning_logs FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS agent_goals_anon_insert ON public.agent_goals;
CREATE POLICY agent_goals_anon_insert
  ON public.agent_goals FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS agent_planner_metrics_anon_insert ON public.agent_planner_metrics;
CREATE POLICY agent_planner_metrics_anon_insert
  ON public.agent_planner_metrics FOR INSERT TO anon WITH CHECK (true);
