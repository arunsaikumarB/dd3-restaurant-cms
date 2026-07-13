-- =============================================================================
-- 052 — Voice Reservation Agent (additive)
-- Orchestrates conversation only; reuses Reservation Engine / CRM tables.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.voice_reservation_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
  location_id text NOT NULL,
  conversation_id text,
  workflow text NOT NULL DEFAULT 'create',
  stage text NOT NULL DEFAULT 'collecting',
  collected jsonb NOT NULL DEFAULT '{}'::jsonb,
  pending_confirmation boolean NOT NULL DEFAULT false,
  reservation_id text,
  confirmation_code text,
  outcome text,
  transfer_recommended boolean NOT NULL DEFAULT false,
  transfer_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_reservation_calls_session
  ON public.voice_reservation_calls (session_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_reservation_calls_loc
  ON public.voice_reservation_calls (location_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.voice_reservation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.voice_reservation_calls(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_reservation_events_call
  ON public.voice_reservation_events (call_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.voice_reservation_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  session_id uuid,
  call_id uuid,
  workflow text,
  outcome text,
  turns int NOT NULL DEFAULT 0,
  duration_ms int NOT NULL DEFAULT 0,
  success boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.voice_waitlist_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid,
  location_id text NOT NULL,
  waitlist_id text,
  guest_name text,
  phone text,
  party_size int,
  event_type text NOT NULL DEFAULT 'joined',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.voice_call_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  location_id text NOT NULL,
  outcome_type text NOT NULL,
  reservation_id text,
  confirmation_code text,
  summary text,
  planner_goal text,
  confidence numeric,
  escalation_recommendation text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_call_outcomes_loc
  ON public.voice_call_outcomes (location_id, created_at DESC);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'voice_reservation_calls',
    'voice_reservation_events',
    'voice_reservation_metrics',
    'voice_waitlist_events',
    'voice_call_outcomes'
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
