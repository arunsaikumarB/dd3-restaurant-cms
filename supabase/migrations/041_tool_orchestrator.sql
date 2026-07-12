-- =============================================================================
-- 041 — Tool Orchestrator observability (additive)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.agent_tool_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid,
  plan_id uuid,
  conversation_id text,
  location_id text,
  tool_id text NOT NULL,
  status text NOT NULL,
  execution_time_ms int NOT NULL DEFAULT 0,
  retries int NOT NULL DEFAULT 0,
  cached boolean NOT NULL DEFAULT false,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  result_preview text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_tool_executions_plan
  ON public.agent_tool_executions (plan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tool_executions_tool
  ON public.agent_tool_executions (tool_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_context_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid,
  conversation_id text,
  location_id text,
  mode text NOT NULL DEFAULT 'sequential',
  duration_ms int NOT NULL DEFAULT 0,
  package_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  timeline_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  success_count int NOT NULL DEFAULT 0,
  failure_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_context_packages_created
  ON public.agent_context_packages (created_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_execution_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  plan_id uuid,
  duration_ms int,
  tool_count int,
  mode text,
  location_id text,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_execution_metrics_key
  ON public.agent_execution_metrics (metric_key, recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_cache_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  location_id text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid,
  plan_id uuid,
  tool_id text NOT NULL,
  status text NOT NULL,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  location_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_failures_created
  ON public.agent_failures (created_at DESC);

ALTER TABLE public.agent_tool_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_context_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_execution_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_cache_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_failures ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agent_tool_executions',
    'agent_context_packages',
    'agent_execution_metrics',
    'agent_cache_metrics',
    'agent_failures'
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
