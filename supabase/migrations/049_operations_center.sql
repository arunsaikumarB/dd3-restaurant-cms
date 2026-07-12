-- =============================================================================
-- 049 — Enterprise Restaurant Operations Center (additive)
-- Consumes existing modules; does not redesign Reservation/CRM/Journey/Workflow.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.operations_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  period text NOT NULL DEFAULT 'today',
  kpis jsonb NOT NULL DEFAULT '{}'::jsonb,
  health_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operations_snapshots_loc_date
  ON public.operations_snapshots (location_id, snapshot_date DESC);

CREATE TABLE IF NOT EXISTS public.operations_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  category text NOT NULL DEFAULT 'operations',
  title text NOT NULL,
  body text,
  status text NOT NULL DEFAULT 'open',
  assigned_to text,
  source_module text,
  source_entity_id text,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operations_alerts_status
  ON public.operations_alerts (location_id, status, severity, created_at DESC);

CREATE TABLE IF NOT EXISTS public.operations_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  overall_score numeric NOT NULL DEFAULT 0,
  reservation_score numeric NOT NULL DEFAULT 0,
  workflow_score numeric NOT NULL DEFAULT 0,
  satisfaction_score numeric NOT NULL DEFAULT 0,
  journey_score numeric NOT NULL DEFAULT 0,
  retention_score numeric NOT NULL DEFAULT 0,
  waitlist_score numeric NOT NULL DEFAULT 0,
  utilization_score numeric NOT NULL DEFAULT 0,
  approval_sla_score numeric NOT NULL DEFAULT 0,
  ai_confidence_score numeric NOT NULL DEFAULT 0,
  knowledge_score numeric NOT NULL DEFAULT 0,
  suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.operations_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  forecast_date date NOT NULL,
  expected_reservations numeric NOT NULL DEFAULT 0,
  busy_hours jsonb NOT NULL DEFAULT '[]'::jsonb,
  table_demand numeric NOT NULL DEFAULT 0,
  catering_volume numeric NOT NULL DEFAULT 0,
  staff_required numeric NOT NULL DEFAULT 0,
  return_rate numeric NOT NULL DEFAULT 0,
  waitlist_probability numeric NOT NULL DEFAULT 0,
  is_peak_day boolean NOT NULL DEFAULT false,
  holiday_demand boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.operations_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  metric_key text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  period text NOT NULL DEFAULT 'today',
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.operations_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text,
  report_type text NOT NULL,
  category text NOT NULL DEFAULT 'operations',
  title text NOT NULL,
  period_start date,
  period_end date,
  format text NOT NULL DEFAULT 'csv',
  content text,
  status text NOT NULL DEFAULT 'ready',
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.operations_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text,
  title text NOT NULL,
  body text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.operations_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL UNIQUE,
  live_refresh_seconds int NOT NULL DEFAULT 12,
  enable_alerts boolean NOT NULL DEFAULT true,
  enable_forecasts boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'operations_snapshots',
    'operations_alerts',
    'operations_health',
    'operations_forecasts',
    'operations_kpis',
    'operations_reports',
    'operations_announcements',
    'operations_settings'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_authenticated_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t || '_authenticated_all', t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_anon_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon USING (true)',
      t || '_anon_select', t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_anon_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO anon WITH CHECK (true)',
      t || '_anon_insert', t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_anon_update', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO anon USING (true) WITH CHECK (true)',
      t || '_anon_update', t
    );
  END LOOP;
END $$;

INSERT INTO public.operations_settings (location_id)
VALUES ('south-plainfield'), ('oak-tree'), ('lawrenceville')
ON CONFLICT (location_id) DO NOTHING;
