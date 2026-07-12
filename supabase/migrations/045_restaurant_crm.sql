-- =============================================================================
-- 045 — Enterprise Restaurant CRM (additive)
-- Does not redesign Planner / Tool Orchestrator / Reservation Engine / Gemini.
-- Links reservations via nullable customer_id only.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.crm_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  preferred_name text,
  phone text,
  email text,
  date_of_birth date,
  anniversary date,
  gender text,
  preferred_language text DEFAULT 'en',
  address text,
  city text,
  state text,
  country text DEFAULT 'US',
  timezone text DEFAULT 'America/New_York',
  profile_photo_url text,
  status text NOT NULL DEFAULT 'active',
  is_vip boolean NOT NULL DEFAULT false,
  visit_count int NOT NULL DEFAULT 0,
  last_visit date,
  lifetime_value numeric NOT NULL DEFAULT 0,
  avg_party_size numeric,
  avg_spend numeric,
  marketing_consent boolean NOT NULL DEFAULT false,
  ai_personalization_consent boolean NOT NULL DEFAULT true,
  privacy_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_customers_phone_loc
  ON public.crm_customers (location_id, phone)
  WHERE phone IS NOT NULL AND phone <> '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_customers_email_loc
  ON public.crm_customers (location_id, lower(email))
  WHERE email IS NOT NULL AND email <> '';
CREATE INDEX IF NOT EXISTS idx_crm_customers_status
  ON public.crm_customers (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_customers_vip
  ON public.crm_customers (is_vip) WHERE is_vip = true;

CREATE TABLE IF NOT EXISTS public.crm_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  preference_key text NOT NULL,
  preference_value text,
  confidence numeric NOT NULL DEFAULT 1.0,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, preference_key)
);

CREATE TABLE IF NOT EXISTS public.crm_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  memory_key text NOT NULL,
  memory_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric NOT NULL DEFAULT 1.0,
  source text NOT NULL DEFAULT 'inferred',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, memory_key)
);

CREATE TABLE IF NOT EXISTS public.crm_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  location_id text,
  reservation_id uuid,
  visit_type text NOT NULL DEFAULT 'reservation',
  visit_date date,
  visit_time time,
  party_size int,
  spend numeric,
  occasion text,
  status text NOT NULL DEFAULT 'completed',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_visits_customer
  ON public.crm_visits (customer_id, visit_date DESC);

CREATE TABLE IF NOT EXISTS public.crm_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  segment_key text NOT NULL,
  score numeric NOT NULL DEFAULT 1,
  source text NOT NULL DEFAULT 'auto',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, segment_key)
);

CREATE TABLE IF NOT EXISTS public.crm_loyalty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE UNIQUE,
  points int NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'silver',
  rewards jsonb NOT NULL DEFAULT '[]'::jsonb,
  coupons jsonb NOT NULL DEFAULT '[]'::jsonb,
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  referral_points int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  author_id uuid,
  note text NOT NULL,
  visibility text NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text,
  summary text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_timeline_customer
  ON public.crm_timeline (customer_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
  location_id text,
  channel text NOT NULL DEFAULT 'ai_chat',
  direction text NOT NULL DEFAULT 'inbound',
  subject text,
  body text,
  summary text,
  conversation_id text,
  status text NOT NULL DEFAULT 'logged',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_communications_customer
  ON public.crm_communications (customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  location_id text,
  insight_type text NOT NULL,
  title text NOT NULL,
  reason text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid,
  action text NOT NULL,
  actor text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text UNIQUE,
  retention_days int NOT NULL DEFAULT 2555,
  auto_segment boolean NOT NULL DEFAULT true,
  auto_loyalty boolean NOT NULL DEFAULT true,
  birthday_reward_points int NOT NULL DEFAULT 50,
  anniversary_reward_points int NOT NULL DEFAULT 75,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Soft-link existing reservations (additive only — does not redesign reservation engine)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_customer_id
  ON public.reservations (customer_id)
  WHERE customer_id IS NOT NULL;

-- Link prior soft guest profiles when phone matches (best-effort, non-destructive)
ALTER TABLE public.reservation_guests
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL;

ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'crm_customers',
    'crm_preferences',
    'crm_memory',
    'crm_visits',
    'crm_segments',
    'crm_loyalty',
    'crm_notes',
    'crm_timeline',
    'crm_communications',
    'crm_insights',
    'crm_audit',
    'crm_settings'
  ]
  LOOP
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

INSERT INTO public.crm_settings (location_id)
VALUES ('south-plainfield'), ('oak-tree'), ('lawrenceville')
ON CONFLICT (location_id) DO NOTHING;
