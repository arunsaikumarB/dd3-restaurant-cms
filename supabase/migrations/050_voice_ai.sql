-- =============================================================================
-- 050 — Voice AI Layer (additive)
-- Audio transport + session management only. Does not redesign Planner / Tools.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.voice_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  channel_web boolean NOT NULL DEFAULT true,
  channel_phone boolean NOT NULL DEFAULT false,
  stt_provider text NOT NULL DEFAULT 'browser',
  tts_provider text NOT NULL DEFAULT 'browser',
  voice_name text NOT NULL DEFAULT 'default',
  voice_gender text NOT NULL DEFAULT 'neutral',
  voice_speed numeric NOT NULL DEFAULT 1.0,
  voice_pitch numeric NOT NULL DEFAULT 1.0,
  language text NOT NULL DEFAULT 'en',
  auto_detect_language boolean NOT NULL DEFAULT true,
  greeting text NOT NULL DEFAULT 'Hi, this is Cheffy from Desi Dhamaka. How can I help you today?',
  silence_timeout_ms int NOT NULL DEFAULT 2500,
  max_call_length_sec int NOT NULL DEFAULT 900,
  allow_interruptions boolean NOT NULL DEFAULT true,
  recording_enabled boolean NOT NULL DEFAULT false,
  recording_retention_days int NOT NULL DEFAULT 30,
  recording_disclaimer text NOT NULL DEFAULT 'This call may be recorded for quality and training.',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.voice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text NOT NULL,
  location_id text NOT NULL,
  channel text NOT NULL DEFAULT 'web',
  customer_id text,
  language text NOT NULL DEFAULT 'en',
  call_state text NOT NULL DEFAULT 'idle',
  current_intent text,
  planner_goal text,
  duration_ms int NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  disconnect_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_loc_started
  ON public.voice_sessions (location_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_conversation
  ON public.voice_sessions (conversation_id);

CREATE TABLE IF NOT EXISTS public.voice_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_events_session
  ON public.voice_events (session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.voice_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
  role text NOT NULL,
  text text NOT NULL,
  is_final boolean NOT NULL DEFAULT true,
  language text,
  confidence numeric,
  stt_provider text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_transcripts_session
  ON public.voice_transcripts (session_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.voice_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
  location_id text NOT NULL,
  storage_path text,
  duration_ms int NOT NULL DEFAULT 0,
  format text NOT NULL DEFAULT 'webm',
  enabled boolean NOT NULL DEFAULT true,
  disclaimer_shown boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.voice_provider_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text,
  session_id uuid,
  provider text NOT NULL,
  provider_kind text NOT NULL,
  operation text NOT NULL,
  latency_ms numeric NOT NULL DEFAULT 0,
  success boolean NOT NULL DEFAULT true,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_provider_metrics_created
  ON public.voice_provider_metrics (created_at DESC);

CREATE TABLE IF NOT EXISTS public.voice_call_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
  location_id text NOT NULL,
  call_duration_ms int NOT NULL DEFAULT 0,
  words_per_minute numeric NOT NULL DEFAULT 0,
  interruptions int NOT NULL DEFAULT 0,
  avg_response_ms numeric NOT NULL DEFAULT 0,
  silence_ms int NOT NULL DEFAULT 0,
  transferred boolean NOT NULL DEFAULT false,
  dropped boolean NOT NULL DEFAULT false,
  call_quality numeric,
  stt_latency_ms numeric NOT NULL DEFAULT 0,
  planner_latency_ms numeric NOT NULL DEFAULT 0,
  tool_latency_ms numeric NOT NULL DEFAULT 0,
  gemini_latency_ms numeric NOT NULL DEFAULT 0,
  reflection_latency_ms numeric NOT NULL DEFAULT 0,
  tts_latency_ms numeric NOT NULL DEFAULT 0,
  total_roundtrip_ms numeric NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'voice_settings',
    'voice_sessions',
    'voice_events',
    'voice_transcripts',
    'voice_recordings',
    'voice_provider_metrics',
    'voice_call_metrics'
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

INSERT INTO public.voice_settings (location_id)
VALUES ('south-plainfield'), ('oak-tree'), ('lawrenceville')
ON CONFLICT (location_id) DO NOTHING;
