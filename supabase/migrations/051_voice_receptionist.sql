-- =============================================================================
-- 051 — Voice Receptionist (additive)
-- Conversation experience layer only. Does not redesign Voice Gateway / Planner.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.voice_greetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  code text NOT NULL DEFAULT 'default',
  template text NOT NULL,
  time_of_day text,
  language text NOT NULL DEFAULT 'en',
  holiday_key text,
  festival_key text,
  event_key text,
  returning_customer boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, code, language)
);

CREATE TABLE IF NOT EXISTS public.voice_personality (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL UNIQUE,
  speaking_speed numeric NOT NULL DEFAULT 1.0,
  pause_duration_ms int NOT NULL DEFAULT 350,
  greeting_style text NOT NULL DEFAULT 'warm',
  closing_style text NOT NULL DEFAULT 'grateful',
  energy_level text NOT NULL DEFAULT 'balanced',
  hospitality_tone text NOT NULL DEFAULT 'warm_professional',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.voice_hospitality (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL UNIQUE,
  restaurant_brand text NOT NULL DEFAULT 'Desi Dhamaka',
  assistant_name text NOT NULL DEFAULT 'Cheffy',
  namaste_enabled boolean NOT NULL DEFAULT true,
  never_robotic boolean NOT NULL DEFAULT true,
  confirm_understanding boolean NOT NULL DEFAULT true,
  reservation_deferral_message text NOT NULL DEFAULT 'I can share hours, directions, and menu details. Full reservation booking will be handled by our booking specialist shortly.',
  closing_message text NOT NULL DEFAULT 'Thank you for calling Desi Dhamaka. We look forward to welcoming you soon. Have a wonderful day!',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.voice_languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  language_code text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  label text NOT NULL,
  UNIQUE (location_id, language_code)
);

CREATE TABLE IF NOT EXISTS public.voice_conversation_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
  location_id text NOT NULL,
  turns int NOT NULL DEFAULT 0,
  interruptions int NOT NULL DEFAULT 0,
  silence_prompts int NOT NULL DEFAULT 0,
  misunderstandings int NOT NULL DEFAULT 0,
  language_switches int NOT NULL DEFAULT 0,
  repeat_requests int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.voice_call_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
  location_id text NOT NULL,
  summary text NOT NULL,
  topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  detected_intents jsonb NOT NULL DEFAULT '[]'::jsonb,
  knowledge_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  planner_goal text,
  duration_ms int NOT NULL DEFAULT 0,
  language text,
  sentiment text,
  escalation_recommendation text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_call_summaries_loc
  ON public.voice_call_summaries (location_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.voice_silence_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL UNIQUE,
  prompt_5s text NOT NULL DEFAULT 'Are you still there?',
  prompt_10s text NOT NULL DEFAULT 'I''ll stay on the line if you need a moment.',
  prompt_20s text NOT NULL DEFAULT 'I''ll go ahead and end the call for now. Feel free to call us back anytime. Take care!',
  end_after_ms int NOT NULL DEFAULT 20000,
  soft_prompt_ms int NOT NULL DEFAULT 5000,
  hold_prompt_ms int NOT NULL DEFAULT 10000,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'voice_greetings',
    'voice_personality',
    'voice_hospitality',
    'voice_languages',
    'voice_conversation_metrics',
    'voice_call_summaries',
    'voice_silence_rules'
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

INSERT INTO public.voice_personality (location_id)
VALUES ('south-plainfield'), ('oak-tree'), ('lawrenceville')
ON CONFLICT (location_id) DO NOTHING;

INSERT INTO public.voice_hospitality (location_id)
VALUES ('south-plainfield'), ('oak-tree'), ('lawrenceville')
ON CONFLICT (location_id) DO NOTHING;

INSERT INTO public.voice_silence_rules (location_id)
VALUES ('south-plainfield'), ('oak-tree'), ('lawrenceville')
ON CONFLICT (location_id) DO NOTHING;

INSERT INTO public.voice_languages (location_id, language_code, label) VALUES
  ('south-plainfield', 'en', 'English'),
  ('south-plainfield', 'hi', 'Hindi'),
  ('south-plainfield', 'te', 'Telugu'),
  ('oak-tree', 'en', 'English'),
  ('oak-tree', 'hi', 'Hindi'),
  ('oak-tree', 'te', 'Telugu'),
  ('lawrenceville', 'en', 'English'),
  ('lawrenceville', 'hi', 'Hindi'),
  ('lawrenceville', 'te', 'Telugu')
ON CONFLICT (location_id, language_code) DO NOTHING;

INSERT INTO public.voice_greetings (location_id, code, language, template) VALUES
  ('south-plainfield', 'default', 'en', 'Namaste! Thank you for calling Desi Dhamaka {{location}}. I''m Cheffy, your AI restaurant assistant. How may I help you today?'),
  ('oak-tree', 'default', 'en', 'Namaste! Thank you for calling Desi Dhamaka {{location}}. I''m Cheffy, your AI restaurant assistant. How may I help you today?'),
  ('lawrenceville', 'default', 'en', 'Namaste! Thank you for calling Desi Dhamaka {{location}}. I''m Cheffy, your AI restaurant assistant. How may I help you today?'),
  ('south-plainfield', 'default', 'hi', 'नमस्ते! देसी धमाका {{location}} में कॉल करने के लिए धन्यवाद। मैं चेफी हूँ। आज मैं आपकी कैसे मदद कर सकती हूँ?'),
  ('south-plainfield', 'default', 'te', 'నమస్తే! దేశీ ధమాకా {{location}} కి కాల్ చేసినందుకు ధన్యవాదాలు. నేను చెఫ్ఫీ. ఈరోజు మీకు ఎలా సహాయం చేయగలను?')
ON CONFLICT (location_id, code, language) DO NOTHING;
