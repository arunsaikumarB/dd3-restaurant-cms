-- =============================================================================
-- 044 — Restaurant Reservation Platform (additive)
-- Does not redesign Planner / Tool Orchestrator / Reflection / Gemini.
-- Extends existing public.reservations; adds ops tables.
-- =============================================================================

-- Soft guest profiles (not full CRM)
CREATE TABLE IF NOT EXISTS public.reservation_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  phone text NOT NULL,
  email text,
  full_name text NOT NULL,
  visit_count int NOT NULL DEFAULT 0,
  last_visit date,
  favorite_table_id uuid,
  favorite_time time,
  celebrations jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  dietary_preferences text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_reservation_guests_location
  ON public.reservation_guests (location_id);

CREATE TABLE IF NOT EXISTS public.table_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  section_id uuid REFERENCES public.table_sections(id) ON DELETE SET NULL,
  table_number text NOT NULL,
  capacity int NOT NULL CHECK (capacity > 0),
  indoor boolean NOT NULL DEFAULT true,
  outdoor boolean NOT NULL DEFAULT false,
  booth boolean NOT NULL DEFAULT false,
  window_seat boolean NOT NULL DEFAULT false,
  vip boolean NOT NULL DEFAULT false,
  private_room boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'available',
  pos_x numeric NOT NULL DEFAULT 0,
  pos_y numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, table_number)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_tables_location
  ON public.restaurant_tables (location_id, status);

CREATE TABLE IF NOT EXISTS public.reservation_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  day_of_week int, -- 0=Sun .. 6=Sat; null = all days
  slot_time time NOT NULL,
  duration_minutes int NOT NULL DEFAULT 90,
  max_covers int,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservation_slots_location
  ON public.reservation_slots (location_id, active);

CREATE TABLE IF NOT EXISTS public.reservation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  rule_key text NOT NULL,
  rule_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, rule_key)
);

CREATE TABLE IF NOT EXISTS public.reservation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL UNIQUE,
  default_duration_minutes int NOT NULL DEFAULT 90,
  buffer_minutes int NOT NULL DEFAULT 15,
  max_guests int NOT NULL DEFAULT 12,
  min_guests int NOT NULL DEFAULT 1,
  advance_booking_days int NOT NULL DEFAULT 60,
  same_day_cutoff_time time,
  deposit_required boolean NOT NULL DEFAULT false,
  allow_waitlist boolean NOT NULL DEFAULT true,
  peak_hours jsonb NOT NULL DEFAULT '[]'::jsonb,
  holiday_dates date[] NOT NULL DEFAULT '{}',
  blocked_dates date[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Extend existing reservations (additive columns only)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS confirmation_code text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS occasion text,
  ADD COLUMN IF NOT EXISTS seating_preference text,
  ADD COLUMN IF NOT EXISTS accessibility_needs text,
  ADD COLUMN IF NOT EXISTS high_chair boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS outdoor_requested boolean,
  ADD COLUMN IF NOT EXISTS booth_requested boolean,
  ADD COLUMN IF NOT EXISTS window_requested boolean,
  ADD COLUMN IF NOT EXISTS dietary_restrictions text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS children_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guest_id uuid REFERENCES public.reservation_guests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS party_notes text,
  ADD COLUMN IF NOT EXISTS duration_minutes int DEFAULT 90,
  ADD COLUMN IF NOT EXISTS no_show boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS conversation_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_confirmation_code
  ON public.reservations (confirmation_code)
  WHERE confirmation_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.table_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid,
  UNIQUE (reservation_id)
);

CREATE TABLE IF NOT EXISTS public.reservation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE CASCADE,
  location_id text,
  event_type text NOT NULL,
  actor text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservation_events_res
  ON public.reservation_events (reservation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.reservation_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  guest_name text NOT NULL,
  phone text NOT NULL,
  email text,
  party_size int NOT NULL CHECK (party_size > 0),
  preferred_date date,
  preferred_time time,
  queue_position int NOT NULL DEFAULT 1,
  estimated_wait_minutes int,
  priority int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'waiting',
  notified_at timestamptz,
  conversation_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservation_waitlist_location
  ON public.reservation_waitlist (location_id, status, queue_position);

CREATE TABLE IF NOT EXISTS public.reservation_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  waitlist_id uuid REFERENCES public.reservation_waitlist(id) ON DELETE SET NULL,
  location_id text,
  channel text NOT NULL DEFAULT 'email',
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservation_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  metric_key text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  period_date date,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservation_analytics_loc
  ON public.reservation_analytics (location_id, metric_key, recorded_at DESC);

-- RLS
ALTER TABLE public.reservation_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_analytics ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'reservation_guests',
    'table_sections',
    'restaurant_tables',
    'reservation_slots',
    'reservation_rules',
    'reservation_settings',
    'table_assignments',
    'reservation_events',
    'reservation_waitlist',
    'reservation_notifications',
    'reservation_analytics'
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
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_anon_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon USING (true)',
      t || '_anon_select', t
    );
  END LOOP;
END $$;

-- Allow anon update on waitlist/notifications status for engine flows
DROP POLICY IF EXISTS reservation_waitlist_anon_update ON public.reservation_waitlist;
CREATE POLICY reservation_waitlist_anon_update ON public.reservation_waitlist
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Seed default settings + sample tables for each known outlet
INSERT INTO public.reservation_settings (location_id)
VALUES ('south-plainfield'), ('oak-tree'), ('lawrenceville')
ON CONFLICT (location_id) DO NOTHING;

INSERT INTO public.reservation_rules (location_id, rule_key, rule_value)
SELECT loc, key, val::jsonb
FROM (VALUES
  ('south-plainfield'), ('oak-tree'), ('lawrenceville')
) AS locs(loc)
CROSS JOIN (VALUES
  ('max_guests', '{"value":12}'),
  ('min_guests', '{"value":1}'),
  ('advance_booking_days', '{"value":60}'),
  ('cancellation_window_hours', '{"value":24}'),
  ('peak_hours', '{"slots":["18:00","18:30","19:00","19:30","20:00"]}'),
  ('kids_policy', '{"high_chair":true,"max_children_ratio":0.5}'),
  ('vip_rules', '{"auto_priority":true}')
) AS rules(key, val)
ON CONFLICT (location_id, rule_key) DO NOTHING;

-- Sample indoor tables per outlet (idempotent by unique table_number)
INSERT INTO public.restaurant_tables (location_id, table_number, capacity, indoor, booth, window_seat, vip, pos_x, pos_y)
SELECT loc, t.num, t.cap, true, t.booth, t.win, t.vip, t.x, t.y
FROM (VALUES ('south-plainfield'), ('oak-tree'), ('lawrenceville')) AS locs(loc)
CROSS JOIN (VALUES
  ('T1', 2, false, true, false, 10, 10),
  ('T2', 2, false, false, false, 30, 10),
  ('T3', 4, true, false, false, 50, 10),
  ('T4', 4, false, true, false, 70, 10),
  ('T5', 6, false, false, false, 10, 40),
  ('T6', 6, true, false, false, 40, 40),
  ('T7', 8, false, false, true, 70, 40),
  ('P1', 10, false, false, true, 40, 70)
) AS t(num, cap, booth, win, vip, x, y)
ON CONFLICT (location_id, table_number) DO NOTHING;

-- Default dinner slots
INSERT INTO public.reservation_slots (location_id, day_of_week, slot_time, duration_minutes, max_covers)
SELECT loc, NULL, slot::time, 90, 80
FROM (VALUES ('south-plainfield'), ('oak-tree'), ('lawrenceville')) AS locs(loc)
CROSS JOIN (VALUES
  ('11:30'), ('12:00'), ('12:30'), ('13:00'), ('13:30'),
  ('17:30'), ('18:00'), ('18:30'), ('19:00'), ('19:30'), ('20:00'), ('20:30'), ('21:00')
) AS s(slot)
WHERE NOT EXISTS (
  SELECT 1 FROM public.reservation_slots rs
  WHERE rs.location_id = loc AND rs.slot_time = s.slot::time AND rs.day_of_week IS NULL
);
