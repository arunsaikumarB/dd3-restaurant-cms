-- =============================================================================
-- 046 — Enterprise Catering & Event Management (additive)
-- Does not redesign Planner / Tool Orchestrator / Reservation / CRM / Gemini.
-- Links events via nullable customer_id only.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.event_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  customer_id uuid,
  customer_name text NOT NULL DEFAULT '',
  phone text,
  email text,
  source text NOT NULL DEFAULT 'website',
  sales_owner text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'new',
  event_type text,
  message_preview text,
  conversation_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_leads_location_status
  ON public.event_leads (location_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_leads_phone
  ON public.event_leads (location_id, phone)
  WHERE phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.event_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  tier text NOT NULL DEFAULT 'silver',
  menu_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  decor_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  staff_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  equipment_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration_hours numeric NOT NULL DEFAULT 3,
  min_guests int NOT NULL DEFAULT 20,
  base_price numeric NOT NULL DEFAULT 0,
  price_per_guest numeric NOT NULL DEFAULT 0,
  addons jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, code)
);

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.event_leads(id) ON DELETE SET NULL,
  location_id text NOT NULL,
  customer_id uuid,
  title text NOT NULL,
  event_type text NOT NULL DEFAULT 'custom',
  workflow_stage text NOT NULL DEFAULT 'inquiry',
  event_date date,
  event_time time,
  guest_count int,
  budget numeric,
  venue_type text DEFAULT 'restaurant',
  venue_address text,
  cuisine text,
  dietary jsonb NOT NULL DEFAULT '[]'::jsonb,
  serving_style text,
  service_mode text,
  needs jsonb NOT NULL DEFAULT '{}'::jsonb,
  special_requests text,
  package_id uuid REFERENCES public.event_packages(id) ON DELETE SET NULL,
  deposit_required numeric DEFAULT 0,
  deposit_received numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  progress_percent int NOT NULL DEFAULT 0,
  conversation_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_location_date
  ON public.events (location_id, event_date);
CREATE INDEX IF NOT EXISTS idx_events_workflow
  ON public.events (location_id, workflow_stage, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_customer
  ON public.events (customer_id)
  WHERE customer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.event_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  location_id text,
  name text NOT NULL DEFAULT 'Custom Menu',
  starters jsonb NOT NULL DEFAULT '[]'::jsonb,
  mains jsonb NOT NULL DEFAULT '[]'::jsonb,
  rice jsonb NOT NULL DEFAULT '[]'::jsonb,
  breads jsonb NOT NULL DEFAULT '[]'::jsonb,
  desserts jsonb NOT NULL DEFAULT '[]'::jsonb,
  drinks jsonb NOT NULL DEFAULT '[]'::jsonb,
  live_counters jsonb NOT NULL DEFAULT '[]'::jsonb,
  kids_menu jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  location_id text NOT NULL,
  version int NOT NULL DEFAULT 1,
  package_id uuid REFERENCES public.event_packages(id) ON DELETE SET NULL,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  service_charge numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  approval_status text NOT NULL DEFAULT 'draft',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_quote_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.event_quotes(id) ON DELETE CASCADE,
  version int NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  comment text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  location_id text,
  department text NOT NULL DEFAULT 'manager',
  title text NOT NULL,
  description text,
  owner_name text,
  status text NOT NULL DEFAULT 'open',
  due_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_tasks_event
  ON public.event_tasks (event_id, status);

CREATE TABLE IF NOT EXISTS public.event_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES public.event_quotes(id) ON DELETE SET NULL,
  stage text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  actor text,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.event_leads(id) ON DELETE SET NULL,
  location_id text,
  channel text NOT NULL DEFAULT 'ai_chat',
  direction text NOT NULL DEFAULT 'inbound',
  subject text,
  body text,
  summary text,
  conversation_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  doc_type text NOT NULL DEFAULT 'quote',
  title text NOT NULL,
  content text,
  url text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  metric_key text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL UNIQUE,
  tax_rate numeric NOT NULL DEFAULT 0.06625,
  service_charge_rate numeric NOT NULL DEFAULT 0.18,
  min_guests int NOT NULL DEFAULT 20,
  deposit_percent numeric NOT NULL DEFAULT 0.3,
  default_duration_hours numeric NOT NULL DEFAULT 3,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.event_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_quote_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'event_leads',
    'event_packages',
    'events',
    'event_menus',
    'event_quotes',
    'event_quote_versions',
    'event_tasks',
    'event_approvals',
    'event_communications',
    'event_documents',
    'event_analytics',
    'event_settings'
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

INSERT INTO public.event_settings (location_id)
VALUES ('south-plainfield'), ('oak-tree'), ('lawrenceville')
ON CONFLICT (location_id) DO NOTHING;

-- Seed packages per outlet
INSERT INTO public.event_packages (
  location_id, code, name, description, tier, min_guests, base_price, price_per_guest,
  menu_json, decor_json, duration_hours, addons
)
SELECT loc, p.code, p.name, p.description, p.tier, p.min_guests, p.base_price, p.ppg,
  p.menu::jsonb, p.decor::jsonb, p.hours, p.addons::jsonb
FROM (VALUES ('south-plainfield'), ('oak-tree'), ('lawrenceville')) AS locs(loc)
CROSS JOIN (VALUES
  ('SILVER', 'Silver Package', 'Classic buffet package', 'silver', 25, 250, 28,
   '{"starters":["Samosa","Pakora"],"mains":["Butter Chicken","Paneer Tikka Masala"],"rice":["Jeera Rice"],"breads":["Naan"],"desserts":["Gulab Jamun"]}',
   '{"theme":"classic"}', 3, '[{"code":"cake","label":"Cake","price":60},{"code":"decor","label":"Basic Decor","price":120}]'),
  ('GOLD', 'Gold Package', 'Premium buffet with live counter', 'gold', 40, 400, 38,
   '{"starters":["Chaat Bar"],"mains":["Lamb Rogan Josh","Dal Makhani"],"rice":["Biryani"],"breads":["Garlic Naan"],"desserts":["Kulfi"],"live_counters":["Dosa"]}',
   '{"theme":"premium","flowers":true}', 4, '[{"code":"dj","label":"DJ","price":350},{"code":"photo","label":"Photography","price":400}]'),
  ('PLATINUM', 'Platinum Package', 'Wedding / reception premium', 'platinum', 80, 900, 52,
   '{"starters":["Chef Specials"],"mains":["Multi-cuisine"],"desserts":["Dessert Station"],"live_counters":["Live Grill","Chaat"]}',
   '{"theme":"luxury","stage":true}', 5, '[{"code":"projector","label":"Projector","price":150},{"code":"music","label":"Live Music","price":500}]'),
  ('CORP_LUNCH', 'Corporate Lunch', 'Office lunch buffet', 'silver', 15, 150, 22,
   '{"mains":["Thali options"],"rice":["Rice"],"breads":["Roti"],"drinks":["Soft drinks"]}',
   '{}', 2, '[{"code":"delivery","label":"Delivery","price":75}]'),
  ('BDAY_DELUXE', 'Birthday Deluxe', 'Birthday party package', 'gold', 20, 300, 32,
   '{"starters":["Kids starters"],"mains":["Family favorites"],"desserts":["Cake pairing"]}',
   '{"balloons":true}', 3, '[{"code":"cake","label":"Celebration Cake","price":75},{"code":"kids","label":"Kids Menu","price":8}]')
) AS p(code, name, description, tier, min_guests, base_price, ppg, menu, decor, hours, addons)
ON CONFLICT (location_id, code) DO NOTHING;
