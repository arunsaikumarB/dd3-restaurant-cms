-- Cheffy AI Concierge — enterprise admin configuration & observability
--
-- ⚠️  SUPABASE SQL EDITOR ONLY — pure PostgreSQL
-- Do NOT paste TypeScript, JavaScript, or React code here.
-- Application logic lives in:
--   src/services/aiAdmin/repository.ts   (CRUD)
--   src/services/aiAdmin/defaults.ts     (default values)
--   src/types/aiAdmin.ts                 (TypeScript types)
--   src/admin/pages/AIConciergePage.tsx  (admin UI)
--
-- Run via Supabase CLI:  supabase db push
-- Or paste THIS FILE ONLY into Supabase → SQL Editor.

-- Optional per-user AI admin access (super_admin | manager | staff)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ai_access_level TEXT
    CHECK (ai_access_level IS NULL OR ai_access_level IN ('super_admin', 'manager', 'staff'));

-- ---------------------------------------------------------------------------
-- Global + per-location settings (JSON sections for flexibility)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT,
  general JSONB NOT NULL DEFAULT '{}'::jsonb,
  knowledge JSONB NOT NULL DEFAULT '{}'::jsonb,
  conversation JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '{}'::jsonb,
  advanced JSONB NOT NULL DEFAULT '{}'::jsonb,
  knowledge_last_sync_at TIMESTAMPTZ,
  knowledge_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (knowledge_status IN ('healthy', 'stale', 'error', 'unknown', 'syncing')),
  updated_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_settings_location_unique UNIQUE (location_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_settings_global_unique_idx
  ON public.ai_settings ((TRUE))
  WHERE location_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ai_settings_per_location_unique_idx
  ON public.ai_settings (location_id)
  WHERE location_id IS NOT NULL;

CREATE TRIGGER ai_settings_set_updated_at
  BEFORE UPDATE ON public.ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Personality (global + location overrides)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_personality (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT,
  assistant_name TEXT NOT NULL DEFAULT 'Cheffy',
  greeting_message TEXT,
  welcome_back_message TEXT,
  farewell_message TEXT,
  typing_messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  tone TEXT NOT NULL DEFAULT 'friendly'
    CHECK (tone IN ('friendly', 'professional', 'luxury', 'casual', 'family')),
  festival_templates JSONB NOT NULL DEFAULT '{}'::jsonb,
  birthday_messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  anniversary_messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  closing_messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  emoji_level TEXT NOT NULL DEFAULT 'low'
    CHECK (emoji_level IN ('low', 'medium', 'high')),
  location_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_personality_location_unique UNIQUE (location_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_personality_global_unique_idx
  ON public.ai_personality ((TRUE))
  WHERE location_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ai_personality_per_location_unique_idx
  ON public.ai_personality (location_id)
  WHERE location_id IS NOT NULL;

CREATE TRIGGER ai_personality_set_updated_at
  BEFORE UPDATE ON public.ai_personality
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Provider settings (no secrets — keys stay in env)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_provider_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'gemini'
    CHECK (provider IN ('gemini', 'openai', 'claude', 'mock')),
  model TEXT,
  temperature NUMERIC(4, 2) NOT NULL DEFAULT 0.70,
  top_p NUMERIC(4, 2) NOT NULL DEFAULT 0.95,
  top_k INTEGER NOT NULL DEFAULT 40,
  max_output_tokens INTEGER NOT NULL DEFAULT 1024,
  streaming_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  retry_count INTEGER NOT NULL DEFAULT 1,
  timeout_ms INTEGER NOT NULL DEFAULT 30000,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'degraded', 'disabled')),
  updated_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER ai_provider_settings_set_updated_at
  BEFORE UPDATE ON public.ai_provider_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Prompt versioning
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  content TEXT NOT NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_prompt_versions_version_idx
  ON public.ai_prompt_versions (version);

CREATE UNIQUE INDEX IF NOT EXISTS ai_prompt_versions_active_idx
  ON public.ai_prompt_versions ((TRUE))
  WHERE is_active = TRUE;

-- ---------------------------------------------------------------------------
-- Suggested questions / chips
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_suggested_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT,
  category TEXT NOT NULL DEFAULT 'quick_chip'
    CHECK (category IN ('quick_chip', 'homepage', 'context', 'seasonal', 'festival', 'location')),
  label TEXT NOT NULL,
  prompt TEXT NOT NULL,
  emoji TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_suggested_questions_category_sort_idx
  ON public.ai_suggested_questions (category, sort_order);

CREATE TRIGGER ai_suggested_questions_set_updated_at
  BEFORE UPDATE ON public.ai_suggested_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Follow-up suggestions by topic
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT,
  topic TEXT NOT NULL,
  label TEXT NOT NULL,
  prompt TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_followups_topic_sort_idx
  ON public.ai_followups (topic, sort_order);

CREATE TRIGGER ai_followups_set_updated_at
  BEFORE UPDATE ON public.ai_followups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Feature flags
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER ai_feature_flags_set_updated_at
  BEFORE UPDATE ON public.ai_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Conversation & tool logs (no PII, no prompts, no API keys)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_conversation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  location_id TEXT,
  provider TEXT,
  model TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  tool_call_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  error_count INTEGER NOT NULL DEFAULT 0,
  is_sandbox BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ai_conversation_logs_started_idx
  ON public.ai_conversation_logs (started_at DESC);

CREATE INDEX IF NOT EXISTS ai_conversation_logs_location_idx
  ON public.ai_conversation_logs (location_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_tool_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_log_id UUID REFERENCES public.ai_conversation_logs (id) ON DELETE CASCADE,
  conversation_id TEXT,
  tool_name TEXT NOT NULL,
  location_id TEXT,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  duration_ms INTEGER,
  cached BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_tool_logs_created_idx
  ON public.ai_tool_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  provider TEXT,
  location_id TEXT,
  message TEXT NOT NULL,
  retried BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_error_logs_created_idx
  ON public.ai_error_logs (created_at DESC);

-- ---------------------------------------------------------------------------
-- Audit trail
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users (id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  changes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_audit_log_created_idx
  ON public.ai_audit_log (created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS — admin only (no public read)
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_personality ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_suggested_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tool_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_audit_log ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'ai_settings', 'ai_personality', 'ai_provider_settings', 'ai_prompt_versions',
    'ai_suggested_questions', 'ai_followups', 'ai_feature_flags',
    'ai_conversation_logs', 'ai_tool_logs', 'ai_error_logs', 'ai_audit_log'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_admin())',
      tbl || '_admin_select', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin())',
      tbl || '_admin_insert', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
      tbl || '_admin_update', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin())',
      tbl || '_admin_delete', tbl
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Seed defaults (global scope)
-- ---------------------------------------------------------------------------
INSERT INTO public.ai_settings (location_id, general, knowledge, conversation, recommendations, advanced, knowledge_status)
VALUES (
  NULL,
  '{
    "ai_enabled": true,
    "floating_assistant": true,
    "welcome_animation": true,
    "voice_greeting": false,
    "typing_animation": true,
    "recommendation_cards": true,
    "follow_up_suggestions": true,
    "dynamic_chips": true,
    "conversation_memory": true,
    "hospitality_personality": true,
    "maintenance_mode": false,
    "default_location_behavior": "visitor_selected"
  }'::jsonb,
  '{
    "homepage": true,
    "offers": true,
    "gallery": true,
    "reviews": true,
    "seo": true,
    "restaurant_settings": true,
    "menu": false,
    "reservations": false,
    "chefgaa": false
  }'::jsonb,
  '{
    "session_timeout_minutes": 30,
    "memory_length": 12,
    "max_messages": 40,
    "context_window": 12,
    "conversation_reset": "manual",
    "welcome_back_duration_minutes": 30,
    "typing_delay_ms": 550,
    "streaming_speed": "normal"
  }'::jsonb,
  '{
    "family": true,
    "vegetarian": true,
    "spicy": true,
    "kids": true,
    "budget": true,
    "celebration": true,
    "office_lunch": true,
    "menu_recommendations": false
  }'::jsonb,
  '{
    "cache_duration_seconds": 60,
    "retry_attempts": 1,
    "streaming_buffer_ms": 50,
    "provider_failover": false,
    "experimental_features": false
  }'::jsonb,
  'unknown'
)
ON CONFLICT (location_id) DO NOTHING;

INSERT INTO public.ai_personality (location_id, assistant_name, tone, emoji_level)
VALUES (NULL, 'Cheffy', 'friendly', 'low')
ON CONFLICT (location_id) DO NOTHING;

INSERT INTO public.ai_provider_settings (provider, model, temperature, top_p, top_k, max_output_tokens)
SELECT 'gemini', NULL, 0.70, 0.95, 40, 1024
WHERE NOT EXISTS (SELECT 1 FROM public.ai_provider_settings LIMIT 1);

INSERT INTO public.ai_feature_flags (key, enabled, config) VALUES
  ('future_openai', FALSE, '{}'::jsonb),
  ('future_claude', FALSE, '{}'::jsonb),
  ('future_menu_tool', FALSE, '{}'::jsonb),
  ('future_reservation_tool', FALSE, '{}'::jsonb),
  ('future_chefgaa_tool', FALSE, '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Default quick chips
INSERT INTO public.ai_suggested_questions (category, label, prompt, emoji, sort_order)
SELECT * FROM (VALUES
  ('quick_chip', '🍛 Menu', 'Show me the menu.', '🍛', 0),
  ('quick_chip', '🎉 Offers', 'What offers are available today?', '🎉', 1),
  ('quick_chip', '📍 Directions', 'How do I get directions?', '📍', 2),
  ('quick_chip', '☎ Call', 'What''s the phone number?', '☎', 3),
  ('quick_chip', '🕒 Hours', 'What are your hours?', '🕒', 4),
  ('quick_chip', '🍽 Catering', 'Tell me about catering options.', '🍽', 5),
  ('quick_chip', '⭐ Reviews', 'What do guests say about you?', '⭐', 6),
  ('quick_chip', '📷 Gallery', 'Show me your gallery.', '📷', 7),
  ('quick_chip', '🛵 Order', 'I want to order online.', '🛵', 8)
) AS v(category, label, prompt, emoji, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.ai_suggested_questions LIMIT 1);

-- Default follow-ups by topic
INSERT INTO public.ai_followups (topic, label, prompt, sort_order)
SELECT * FROM (VALUES
  ('offers', '🛵 Order online?', 'I''d like to order online.', 0),
  ('offers', '🍛 See the menu?', 'Show me the menu.', 1),
  ('location', '📍 Get directions?', 'How do I get directions?', 0),
  ('location', '🕒 What are your hours?', 'What are your hours?', 1),
  ('menu', '🌱 Vegetarian options?', 'What vegetarian options do you have?', 0),
  ('menu', '🛵 Order now?', 'I want to order online.', 1),
  ('catering', '☎ Talk to our team?', 'How can I contact you about catering?', 0),
  ('reviews', '🍛 Try popular dishes?', 'What are your most popular dishes?', 0)
) AS v(topic, label, prompt, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.ai_followups LIMIT 1);
