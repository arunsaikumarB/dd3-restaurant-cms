-- =============================================================================
-- 054 — Enterprise Outbound AI Calling Platform (additive)
-- Reuses Voice Gateway sessions, CRM, Reservation Engine, Human Handoff.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.voice_outbound_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  name text NOT NULL,
  description text,
  campaign_type text NOT NULL DEFAULT 'one_time',
  -- one_time | scheduled | recurring | event_triggered | crm_triggered | restaurant_triggered | ai_recommended
  call_type text NOT NULL DEFAULT 'reservation_reminder',
  status text NOT NULL DEFAULT 'draft',
  -- draft | pending_approval | approved | running | paused | completed | cancelled
  trigger_code text,
  audience_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  retry_policy jsonb NOT NULL DEFAULT '{"maxAttempts":3,"retryDelayMinutes":60,"respectBusinessHours":true}'::jsonb,
  template_id uuid,
  transfer_mode text NOT NULL DEFAULT 'warm',
  approval_required boolean NOT NULL DEFAULT true,
  approved_by text,
  approved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_outbound_campaigns_loc
  ON public.voice_outbound_campaigns (location_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.voice_campaign_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  call_type text NOT NULL,
  script_hint text,
  voicemail_hint text,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, code)
);

CREATE TABLE IF NOT EXISTS public.voice_campaign_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.voice_outbound_campaigns(id) ON DELETE CASCADE,
  location_id text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  -- queued | running | completed | failed | cancelled
  audience_count int NOT NULL DEFAULT 0,
  placed_count int NOT NULL DEFAULT 0,
  answered_count int NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.voice_outbound_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.voice_outbound_campaigns(id) ON DELETE SET NULL,
  run_id uuid REFERENCES public.voice_campaign_runs(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.voice_sessions(id) ON DELETE SET NULL,
  location_id text NOT NULL,
  customer_id text,
  customer_name text,
  customer_phone text NOT NULL,
  call_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  -- queued | dialing | ringing | answered | voicemail | busy | rejected | no_answer | transferred | completed | failed | opted_out | compliance_blocked
  outcome text,
  attempt int NOT NULL DEFAULT 1,
  max_attempts int NOT NULL DEFAULT 3,
  scheduled_for timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  duration_ms int NOT NULL DEFAULT 0,
  script_text text,
  voicemail_text text,
  reservation_id text,
  confirmation_code text,
  planner_goal text,
  context_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_outbound_calls_loc
  ON public.voice_outbound_calls (location_id, status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_voice_outbound_calls_phone
  ON public.voice_outbound_calls (customer_phone, created_at DESC);

CREATE TABLE IF NOT EXISTS public.voice_outbound_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbound_call_id uuid NOT NULL REFERENCES public.voice_outbound_calls(id) ON DELETE CASCADE,
  location_id text NOT NULL,
  session_id uuid,
  outcome_type text NOT NULL,
  reservation_action text,
  confirmation_code text,
  summary text,
  sentiment text,
  converted boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.voice_retry_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbound_call_id uuid NOT NULL REFERENCES public.voice_outbound_calls(id) ON DELETE CASCADE,
  location_id text NOT NULL,
  attempt int NOT NULL DEFAULT 1,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  -- queued | processing | done | cancelled | skipped
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_retry_queue_due
  ON public.voice_retry_queue (status, scheduled_for);

CREATE TABLE IF NOT EXISTS public.voice_opt_outs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text,
  phone text NOT NULL,
  email text,
  customer_id text,
  reason text,
  source text NOT NULL DEFAULT 'voice',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phone)
);

CREATE TABLE IF NOT EXISTS public.voice_scheduler_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  job_type text NOT NULL,
  -- campaign_run | outbound_dial | retry | trigger_scan
  ref_id text,
  status text NOT NULL DEFAULT 'pending',
  -- pending | running | done | failed | cancelled
  run_at timestamptz NOT NULL,
  locked_at timestamptz,
  completed_at timestamptz,
  error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_scheduler_jobs_due
  ON public.voice_scheduler_jobs (status, run_at);

CREATE TABLE IF NOT EXISTS public.voice_outbound_compliance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL UNIQUE,
  calling_hours_start text NOT NULL DEFAULT '10:00',
  calling_hours_end text NOT NULL DEFAULT '20:00',
  quiet_hours_start text NOT NULL DEFAULT '21:00',
  quiet_hours_end text NOT NULL DEFAULT '09:00',
  timezone text NOT NULL DEFAULT 'America/New_York',
  require_consent boolean NOT NULL DEFAULT true,
  require_recording_consent boolean NOT NULL DEFAULT false,
  holiday_dates jsonb NOT NULL DEFAULT '[]'::jsonb,
  country_code text NOT NULL DEFAULT 'US',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'voice_outbound_campaigns',
    'voice_campaign_templates',
    'voice_campaign_runs',
    'voice_outbound_calls',
    'voice_outbound_outcomes',
    'voice_retry_queue',
    'voice_opt_outs',
    'voice_scheduler_jobs',
    'voice_outbound_compliance'
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

-- Seed compliance + templates for known outlets
INSERT INTO public.voice_outbound_compliance (location_id)
SELECT loc FROM (VALUES ('south-plainfield'), ('oak-tree'), ('lawrenceville')) AS l(loc)
ON CONFLICT (location_id) DO NOTHING;

INSERT INTO public.voice_campaign_templates (location_id, code, name, call_type, script_hint, voicemail_hint, variables)
SELECT loc, code, name, call_type, script_hint, voicemail_hint, variables::jsonb
FROM (VALUES
  ('reservation_reminder', 'Reservation Reminder', 'reservation_reminder',
   'Remind {{name}} of reservation on {{date}} at {{time}} for {{guests}}. Offer confirm, modify, or cancel.',
   'Hi {{name}}, this is Cheffy from Desi Dhamaka with a reminder about your reservation {{date}} at {{time}}. Please call us back if you need to make changes.',
   '["name","date","time","guests","confirmationCode","outlet"]'),
  ('reservation_confirmation', 'Reservation Confirmation', 'reservation_confirmation',
   'Confirm reservation {{confirmationCode}} for {{name}}.',
   'Hi {{name}}, confirming your Desi Dhamaka reservation. Call us if anything changes.',
   '["name","date","time","guests","confirmationCode"]'),
  ('birthday_greeting', 'Birthday Greeting', 'birthday_greeting',
   'Wish {{name}} a happy birthday and offer complimentary dessert.',
   'Happy Birthday from everyone at Desi Dhamaka, {{name}}! Enjoy a complimentary dessert on your next visit.',
   '["name","outlet","offer"]'),
  ('waitlist_available', 'Waitlist Available', 'waitlist_available',
   'Notify {{name}} that a table is available. Offer to hold briefly.',
   'Hi {{name}}, a table opened at Desi Dhamaka. Call us back soon if you still need a seat.',
   '["name","outlet","partySize"]'),
  ('promotion', 'Special Promotion', 'special_promotions',
   'Share current offer {{offer}} with {{name}} naturally. Never pressure.',
   'Hi {{name}}, Desi Dhamaka has a special offer you might enjoy. Call us for details.',
   '["name","offer","outlet"]'),
  ('feedback', 'Customer Feedback', 'customer_feedback',
   'Thank {{name}} for visiting and invite brief feedback.',
   'Hi {{name}}, thanks for dining with Desi Dhamaka. We would love your feedback when you have a moment.',
   '["name","outlet"]'),
  ('missed_callback', 'Missed Call Callback', 'missed_call_callback',
   'Return {{name}}''s missed call and offer help with reservations or questions.',
   'Hi {{name}}, this is Cheffy from Desi Dhamaka returning your call. Please call us back when convenient.',
   '["name","outlet"]')
) AS t(code, name, call_type, script_hint, voicemail_hint, variables)
CROSS JOIN (VALUES ('south-plainfield'), ('oak-tree'), ('lawrenceville')) AS l(loc)
ON CONFLICT (location_id, code) DO NOTHING;
