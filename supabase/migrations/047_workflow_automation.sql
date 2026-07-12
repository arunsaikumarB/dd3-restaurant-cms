-- =============================================================================
-- 047 — Enterprise Workflow Automation (additive)
-- Does not redesign Planner / Orchestrator / Reflection / Reservation / CRM / Events.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.workflow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  source text NOT NULL,
  entity_type text,
  entity_id text,
  location_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  version int NOT NULL DEFAULT 1,
  correlation_id text,
  idempotency_key text,
  status text NOT NULL DEFAULT 'received',
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_events_idempotency
  ON public.workflow_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_events_type_created
  ON public.workflow_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_events_location
  ON public.workflow_events (location_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.workflow_event_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL UNIQUE,
  source text NOT NULL,
  description text,
  payload_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflow_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  trigger_event text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  current_version int NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, code)
);

CREATE TABLE IF NOT EXISTS public.workflow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id uuid NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  version int NOT NULL,
  graph jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  published boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (definition_id, version)
);

CREATE TABLE IF NOT EXISTS public.workflow_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id uuid NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.workflow_versions(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.workflow_events(id) ON DELETE SET NULL,
  location_id text,
  status text NOT NULL DEFAULT 'running',
  current_node text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error text,
  retry_count int NOT NULL DEFAULT 0,
  UNIQUE (event_id, definition_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_instances_status
  ON public.workflow_instances (status, started_at DESC);

CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.workflow_instances(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  node_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempt int NOT NULL DEFAULT 1,
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflow_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES public.workflow_instances(id) ON DELETE SET NULL,
  location_id text,
  title text NOT NULL,
  description text,
  department text NOT NULL DEFAULT 'manager',
  owner_name text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  due_at timestamptz,
  depends_on uuid[],
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status
  ON public.workflow_tasks (location_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.workflow_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES public.workflow_instances(id) ON DELETE SET NULL,
  location_id text,
  title text NOT NULL,
  stage text NOT NULL DEFAULT 'manager',
  status text NOT NULL DEFAULT 'pending',
  actor text,
  comment text,
  timeout_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.workflow_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES public.workflow_instances(id) ON DELETE SET NULL,
  location_id text,
  channel text NOT NULL DEFAULT 'in_app',
  template_key text,
  recipient text,
  subject text,
  body text,
  status text NOT NULL DEFAULT 'queued',
  scheduled_at timestamptz,
  sent_at timestamptz,
  retry_count int NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflow_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  event_type text,
  condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  action jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  priority int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, code)
);

CREATE TABLE IF NOT EXISTS public.workflow_dead_letter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES public.workflow_instances(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.workflow_events(id) ON DELETE SET NULL,
  location_id text,
  reason text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  retry_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.workflow_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text,
  metric_key text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflow_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL UNIQUE,
  max_retries int NOT NULL DEFAULT 3,
  default_timeout_minutes int NOT NULL DEFAULT 60,
  enable_automation boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.workflow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_event_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_dead_letter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_settings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'workflow_events',
    'workflow_event_registry',
    'workflow_definitions',
    'workflow_versions',
    'workflow_instances',
    'workflow_steps',
    'workflow_tasks',
    'workflow_approvals',
    'workflow_notifications',
    'workflow_rules',
    'workflow_dead_letter',
    'workflow_metrics',
    'workflow_settings'
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

INSERT INTO public.workflow_settings (location_id)
VALUES ('south-plainfield'), ('oak-tree'), ('lawrenceville')
ON CONFLICT (location_id) DO NOTHING;

-- Event registry seed
INSERT INTO public.workflow_event_registry (event_type, source, description) VALUES
  ('ReservationCreated', 'reservations', 'New reservation booked'),
  ('ReservationModified', 'reservations', 'Reservation changed'),
  ('ReservationCancelled', 'reservations', 'Reservation cancelled'),
  ('ReservationCheckedIn', 'reservations', 'Guest checked in'),
  ('ReservationCompleted', 'reservations', 'Reservation completed'),
  ('CustomerCreated', 'crm', 'CRM customer created'),
  ('CustomerUpdated', 'crm', 'CRM customer updated'),
  ('CustomerBirthday', 'crm', 'Customer birthday today'),
  ('LeadQualified', 'catering', 'Catering lead qualified'),
  ('ProposalGenerated', 'catering', 'Catering proposal / quote generated'),
  ('QuoteApproved', 'catering', 'Quote approved'),
  ('EventConfirmed', 'catering', 'Catering event confirmed'),
  ('PaymentReceived', 'payments', 'Payment / deposit received (future)'),
  ('ReviewSubmitted', 'reviews', 'Guest review submitted'),
  ('ComplaintRaised', 'crm', 'Complaint raised'),
  ('LoyaltyTierChanged', 'crm', 'Loyalty tier changed'),
  ('PlannerGoalCompleted', 'ai_planner', 'Planner goal completed (observability)'),
  ('ReflectionEscalated', 'reflection', 'Reflection escalated to human')
ON CONFLICT (event_type) DO NOTHING;

-- Global business rules (location_id null = all outlets)
INSERT INTO public.workflow_rules (location_id, code, name, description, event_type, condition, action, priority)
VALUES
  (NULL, 'LARGE_PARTY_APPROVAL', 'Large party approval', 'Reservations over 20 guests need manager approval',
   'ReservationCreated',
   '{"field":"guests","op":"gt","value":20}'::jsonb,
   '{"type":"approval","stage":"manager","title":"Large party approval"}'::jsonb,
   10),
  (NULL, 'BIRTHDAY_COUPON', 'Birthday coupon', 'Birthday reservations get decoration + coupon',
   'ReservationCreated',
   '{"field":"occasion","op":"eq","value":"birthday"}'::jsonb,
   '{"type":"notify","channel":"in_app","template":"birthday_offer"}'::jsonb,
   20),
  (NULL, 'VIP_PREFERRED_TABLE', 'VIP preferred table', 'VIP guests get preferred seating task',
   'ReservationCreated',
   '{"field":"vip","op":"eq","value":true}'::jsonb,
   '{"type":"task","department":"host","title":"Assign preferred VIP table"}'::jsonb,
   15),
  (NULL, 'CUSTOMER_BIRTHDAY', 'Customer birthday outreach', 'Birthday CRM event triggers greeting',
   'CustomerBirthday',
   '{}'::jsonb,
   '{"type":"notify","channel":"email","template":"birthday_greeting"}'::jsonb,
   30)
ON CONFLICT (location_id, code) DO NOTHING;

-- Seed workflow definitions (global location_id null)
INSERT INTO public.workflow_definitions (location_id, code, name, description, trigger_event, active, current_version)
VALUES
  (NULL, 'RESERVATION_CREATED_FLOW', 'Reservation Created Automation',
   'Staff task, notify manager, reminder, CRM touch', 'ReservationCreated', true, 1),
  (NULL, 'BIRTHDAY_RESERVATION_FLOW', 'Birthday Reservation Automation',
   'Decor, cake reminder, coupon, manager notify', 'ReservationCreated', true, 1),
  (NULL, 'CATERING_CONFIRMED_FLOW', 'Catering Confirmed Automation',
   'Kitchen, purchase, delivery, manager notify', 'EventConfirmed', true, 1),
  (NULL, 'CUSTOMER_BIRTHDAY_FLOW', 'Customer Birthday Automation',
   'Coupon, email, CRM timeline note', 'CustomerBirthday', true, 1),
  (NULL, 'LARGE_PARTY_APPROVAL_FLOW', 'Large Party Approval',
   'Manager then owner approval for large parties', 'ReservationCreated', true, 1)
ON CONFLICT (location_id, code) DO NOTHING;

-- Versions with node graphs
INSERT INTO public.workflow_versions (definition_id, version, graph, rules, published, created_by)
SELECT d.id, 1, g.graph::jsonb, '[]'::jsonb, true, 'system'
FROM public.workflow_definitions d
JOIN (VALUES
  ('RESERVATION_CREATED_FLOW', '{
    "nodes":[
      {"id":"t1","type":"trigger","label":"ReservationCreated"},
      {"id":"task1","type":"task","label":"Assign host","config":{"department":"host","title":"Assign host for reservation","priority":"high"}},
      {"id":"task2","type":"task","label":"Confirm table","config":{"department":"manager","title":"Confirm table assignment"}},
      {"id":"n1","type":"notification","label":"Notify manager","config":{"channel":"in_app","subject":"New reservation","template":"reservation_created"}},
      {"id":"delay1","type":"delay","label":"Reminder delay","config":{"minutes":60}},
      {"id":"n2","type":"notification","label":"Guest reminder","config":{"channel":"in_app","subject":"Reservation reminder","template":"reservation_reminder"}},
      {"id":"end","type":"end","label":"End"}
    ],
    "edges":[
      {"from":"t1","to":"task1"},
      {"from":"task1","to":"task2"},
      {"from":"task2","to":"n1"},
      {"from":"n1","to":"delay1"},
      {"from":"delay1","to":"n2"},
      {"from":"n2","to":"end"}
    ]
  }'),
  ('BIRTHDAY_RESERVATION_FLOW', '{
    "nodes":[
      {"id":"t1","type":"trigger","label":"ReservationCreated"},
      {"id":"cond1","type":"condition","label":"Is birthday?","config":{"field":"occasion","op":"eq","value":"birthday"}},
      {"id":"task1","type":"task","label":"Decoration","config":{"department":"decor","title":"Birthday decoration setup"}},
      {"id":"task2","type":"task","label":"Cake reminder","config":{"department":"kitchen","title":"Prepare birthday cake / dessert"}},
      {"id":"n1","type":"notification","label":"Birthday coupon","config":{"channel":"email","template":"birthday_coupon","subject":"Birthday offer"}},
      {"id":"n2","type":"notification","label":"Manager notify","config":{"channel":"in_app","subject":"Birthday reservation"}},
      {"id":"end","type":"end","label":"End"},
      {"id":"skip","type":"end","label":"Skip"}
    ],
    "edges":[
      {"from":"t1","to":"cond1"},
      {"from":"cond1","to":"task1","when":"true"},
      {"from":"cond1","to":"skip","when":"false"},
      {"from":"task1","to":"task2"},
      {"from":"task2","to":"n1"},
      {"from":"n1","to":"n2"},
      {"from":"n2","to":"end"}
    ]
  }'),
  ('CATERING_CONFIRMED_FLOW', '{
    "nodes":[
      {"id":"t1","type":"trigger","label":"EventConfirmed"},
      {"id":"task1","type":"task","label":"Kitchen prep","config":{"department":"kitchen","title":"Catering kitchen prep"}},
      {"id":"task2","type":"task","label":"Purchasing","config":{"department":"purchasing","title":"Procure catering supplies"}},
      {"id":"task3","type":"task","label":"Delivery","config":{"department":"delivery","title":"Assign delivery / setup"}},
      {"id":"n1","type":"notification","label":"Manager","config":{"channel":"in_app","subject":"Catering confirmed"}},
      {"id":"end","type":"end","label":"End"}
    ],
    "edges":[
      {"from":"t1","to":"task1"},
      {"from":"task1","to":"task2"},
      {"from":"task2","to":"task3"},
      {"from":"task3","to":"n1"},
      {"from":"n1","to":"end"}
    ]
  }'),
  ('CUSTOMER_BIRTHDAY_FLOW', '{
    "nodes":[
      {"id":"t1","type":"trigger","label":"CustomerBirthday"},
      {"id":"n1","type":"notification","label":"Coupon email","config":{"channel":"email","template":"birthday_greeting","subject":"Happy Birthday from Desi Dhamaka"}},
      {"id":"n2","type":"notification","label":"In-app","config":{"channel":"in_app","subject":"Customer birthday today"}},
      {"id":"end","type":"end","label":"End"}
    ],
    "edges":[
      {"from":"t1","to":"n1"},
      {"from":"n1","to":"n2"},
      {"from":"n2","to":"end"}
    ]
  }'),
  ('LARGE_PARTY_APPROVAL_FLOW', '{
    "nodes":[
      {"id":"t1","type":"trigger","label":"ReservationCreated"},
      {"id":"cond1","type":"condition","label":"Guests > 20","config":{"field":"guests","op":"gt","value":20}},
      {"id":"a1","type":"approval","label":"Manager","config":{"stage":"manager","title":"Large party — manager"}},
      {"id":"a2","type":"approval","label":"Owner","config":{"stage":"owner","title":"Large party — owner"}},
      {"id":"n1","type":"notification","label":"Approved","config":{"channel":"in_app","subject":"Large party approved"}},
      {"id":"end","type":"end","label":"End"},
      {"id":"skip","type":"end","label":"Skip"}
    ],
    "edges":[
      {"from":"t1","to":"cond1"},
      {"from":"cond1","to":"a1","when":"true"},
      {"from":"cond1","to":"skip","when":"false"},
      {"from":"a1","to":"a2"},
      {"from":"a2","to":"n1"},
      {"from":"n1","to":"end"}
    ]
  }')
) AS g(code, graph) ON d.code = g.code
ON CONFLICT (definition_id, version) DO NOTHING;
