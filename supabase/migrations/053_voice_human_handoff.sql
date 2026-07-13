-- =============================================================================
-- 053 — Human Handoff & Live Staff Collaboration (additive)
-- Voice orchestrates escalation/transfer; reuses CRM + Reservation tables.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.voice_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  priority_default int NOT NULL DEFAULT 5,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, code)
);

CREATE TABLE IF NOT EXISTS public.voice_live_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  user_id text,
  display_name text NOT NULL,
  email text,
  phone text,
  department_code text NOT NULL DEFAULT 'general',
  role text NOT NULL DEFAULT 'staff',
  -- role: super_admin | manager | host | reservations | support | staff | catering | events
  status text NOT NULL DEFAULT 'offline',
  -- status: available | busy | offline | away
  max_concurrent int NOT NULL DEFAULT 1,
  active_calls int NOT NULL DEFAULT 0,
  last_heartbeat_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_live_agents_loc_status
  ON public.voice_live_agents (location_id, status);

CREATE TABLE IF NOT EXISTS public.voice_escalation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  triggers jsonb NOT NULL DEFAULT '[]'::jsonb,
  department_code text NOT NULL DEFAULT 'general',
  priority int NOT NULL DEFAULT 5,
  transfer_mode text NOT NULL DEFAULT 'warm',
  -- warm | cold | supervisor | conference
  auto_queue boolean NOT NULL DEFAULT true,
  enabled boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, code)
);

CREATE TABLE IF NOT EXISTS public.voice_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
  location_id text NOT NULL,
  reason text NOT NULL,
  scenario text NOT NULL,
  priority int NOT NULL DEFAULT 5,
  department_code text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'recommended',
  -- recommended | queued | transferring | accepted | completed | cancelled | failed | callback
  conversation_summary text,
  planner_goal text,
  reflection_confidence numeric,
  reservation_status text,
  crm_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_sentiment text,
  knowledge_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_action text,
  transfer_mode text NOT NULL DEFAULT 'warm',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_voice_escalations_session
  ON public.voice_escalations (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_escalations_loc_status
  ON public.voice_escalations (location_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.voice_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_id uuid NOT NULL REFERENCES public.voice_escalations(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
  location_id text NOT NULL,
  department_code text NOT NULL,
  transfer_mode text NOT NULL DEFAULT 'warm',
  status text NOT NULL DEFAULT 'waiting',
  -- waiting | ringing | accepted | rejected | missed | completed | failed
  from_agent text NOT NULL DEFAULT 'cheffy',
  to_agent_id uuid REFERENCES public.voice_live_agents(id) ON DELETE SET NULL,
  accepted_by text,
  queued_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  wait_ms int NOT NULL DEFAULT 0,
  context_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  audit jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_transfers_loc_status
  ON public.voice_transfers (location_id, status, queued_at DESC);

CREATE TABLE IF NOT EXISTS public.voice_call_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid,
  location_id text NOT NULL,
  escalation_id uuid,
  transfer_id uuid,
  task_type text NOT NULL,
  -- callback | follow_up | manager_review | refund_review | complaint_ticket | vip_follow_up | reservation_confirmation
  title text NOT NULL,
  description text,
  assignee_id uuid,
  status text NOT NULL DEFAULT 'open',
  priority int NOT NULL DEFAULT 5,
  due_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.voice_staff_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  location_id text NOT NULL,
  escalation_id uuid,
  transfer_id uuid,
  author_id text,
  author_name text,
  note text NOT NULL,
  visible_to_ai boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.voice_callback_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  session_id uuid,
  escalation_id uuid,
  customer_name text,
  customer_phone text,
  customer_email text,
  reason text,
  department_code text NOT NULL DEFAULT 'general',
  priority int NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'queued',
  -- queued | assigned | completed | cancelled | failed
  scheduled_for timestamptz,
  assigned_agent_id uuid,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_voice_callback_queue_loc
  ON public.voice_callback_queue (location_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.voice_transfer_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  session_id uuid,
  escalation_id uuid,
  transfer_id uuid,
  metric_type text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.voice_handoff_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  session_id uuid,
  escalation_id uuid,
  transfer_id uuid,
  channel text NOT NULL DEFAULT 'dashboard',
  -- dashboard | browser | email | sms | slack | teams
  recipient text,
  subject text,
  body text,
  status text NOT NULL DEFAULT 'queued',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'voice_departments',
    'voice_live_agents',
    'voice_escalation_rules',
    'voice_escalations',
    'voice_transfers',
    'voice_call_tasks',
    'voice_staff_notes',
    'voice_callback_queue',
    'voice_transfer_metrics',
    'voice_handoff_notifications'
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

-- Seed default departments for known outlets (idempotent)
INSERT INTO public.voice_departments (location_id, code, name, description, priority_default)
SELECT loc, code, name, description, priority
FROM (VALUES
  ('host', 'Host Stand', 'Front-of-house seating and walk-ins', 4),
  ('manager', 'Manager', 'Complaints, VIP, emergencies', 1),
  ('reservations', 'Reservations', 'Booking changes and complex reservations', 3),
  ('catering', 'Catering', 'Large catering and buffet requests', 2),
  ('events', 'Events', 'Weddings, corporate, private parties', 2),
  ('support', 'Support', 'Refunds and payment issues', 2),
  ('general', 'General Staff', 'General guest assistance', 5)
) AS d(code, name, description, priority)
CROSS JOIN (VALUES
  ('south-plainfield'),
  ('oak-tree'),
  ('lawrenceville')
) AS l(loc)
ON CONFLICT (location_id, code) DO NOTHING;

INSERT INTO public.voice_escalation_rules (location_id, code, name, triggers, department_code, priority, transfer_mode)
SELECT loc, code, name, triggers::jsonb, department_code, priority, transfer_mode
FROM (VALUES
  ('manager_request', 'Customer requests manager', '["manager_request","staff_requested"]', 'manager', 1, 'warm'),
  ('complaint', 'Complaint', '["complaint"]', 'manager', 1, 'warm'),
  ('refund', 'Refund request', '["refund","payment_issue"]', 'support', 2, 'warm'),
  ('vip', 'VIP guest', '["vip"]', 'manager', 1, 'supervisor'),
  ('large_party', 'Large party', '["large_party"]', 'reservations', 3, 'warm'),
  ('corporate', 'Corporate event', '["corporate","wedding"]', 'events', 2, 'warm'),
  ('accessibility', 'Accessibility needs', '["accessibility"]', 'host', 2, 'warm'),
  ('complex_reservation', 'Complex reservation', '["complex_reservation"]', 'reservations', 3, 'warm'),
  ('low_confidence', 'Repeated low confidence', '["low_confidence","misunderstanding","no_knowledge"]', 'general', 4, 'warm'),
  ('emergency', 'Emergency', '["emergency"]', 'manager', 1, 'cold')
) AS r(code, name, triggers, department_code, priority, transfer_mode)
CROSS JOIN (VALUES
  ('south-plainfield'),
  ('oak-tree'),
  ('lawrenceville')
) AS l(loc)
ON CONFLICT (location_id, code) DO NOTHING;
