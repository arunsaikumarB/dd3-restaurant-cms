-- =============================================================================
-- 048 — Enterprise Customer Journey Engine (additive)
-- Does not redesign Planner / Orchestrator / Reservation / CRM / Workflow / Events.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.journey_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 100,
  is_terminal boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, code)
);

CREATE TABLE IF NOT EXISTS public.journey_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  current_version int NOT NULL DEFAULT 1,
  graph jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, code)
);

CREATE TABLE IF NOT EXISTS public.journey_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id uuid NOT NULL REFERENCES public.journey_definitions(id) ON DELETE CASCADE,
  version int NOT NULL,
  graph jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (definition_id, version)
);

CREATE TABLE IF NOT EXISTS public.journey_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  from_stage text,
  to_stage text NOT NULL,
  condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority int NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, code)
);

CREATE TABLE IF NOT EXISTS public.customer_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL,
  customer_id uuid NOT NULL,
  stage_code text NOT NULL DEFAULT 'visitor',
  previous_stage text,
  relationship_score numeric NOT NULL DEFAULT 0,
  engagement_score numeric NOT NULL DEFAULT 0,
  visit_score numeric NOT NULL DEFAULT 0,
  loyalty_score numeric NOT NULL DEFAULT 0,
  ai_score numeric NOT NULL DEFAULT 0,
  review_score numeric NOT NULL DEFAULT 0,
  cancellation_risk numeric NOT NULL DEFAULT 0,
  churn_risk numeric NOT NULL DEFAULT 0,
  retention_score numeric NOT NULL DEFAULT 0,
  next_best_action text,
  next_best_action_reason text,
  segment_codes text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  stage_changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_journeys_stage
  ON public.customer_journeys (location_id, stage_code);

CREATE TABLE IF NOT EXISTS public.journey_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text,
  customer_id uuid NOT NULL,
  milestone_code text NOT NULL,
  title text NOT NULL,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (customer_id, milestone_code)
);

CREATE TABLE IF NOT EXISTS public.journey_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  location_id text,
  engagement_score numeric NOT NULL DEFAULT 0,
  visit_score numeric NOT NULL DEFAULT 0,
  loyalty_score numeric NOT NULL DEFAULT 0,
  ai_score numeric NOT NULL DEFAULT 0,
  review_score numeric NOT NULL DEFAULT 0,
  cancellation_risk numeric NOT NULL DEFAULT 0,
  churn_risk numeric NOT NULL DEFAULT 0,
  retention_score numeric NOT NULL DEFAULT 0,
  relationship_score numeric NOT NULL DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journey_scores_customer
  ON public.journey_scores (customer_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.journey_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text,
  customer_id uuid,
  event_type text NOT NULL,
  title text NOT NULL,
  summary text,
  source text NOT NULL DEFAULT 'journey',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journey_events_customer
  ON public.journey_events (customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.journey_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text,
  customer_id uuid NOT NULL,
  action_code text NOT NULL,
  title text NOT NULL,
  reason text,
  priority int NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'open',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.journey_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text,
  customer_id uuid,
  trigger_type text NOT NULL,
  campaign_key text NOT NULL,
  status text NOT NULL DEFAULT 'triggered',
  workflow_event_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.journey_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, code)
);

CREATE TABLE IF NOT EXISTS public.journey_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  location_id text,
  from_stage text,
  to_stage text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.journey_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text NOT NULL UNIQUE,
  inactive_days int NOT NULL DEFAULT 60,
  at_risk_days int NOT NULL DEFAULT 90,
  vip_visit_threshold int NOT NULL DEFAULT 8,
  frequent_visit_threshold int NOT NULL DEFAULT 4,
  enable_campaigns boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'journey_stages',
    'journey_definitions',
    'journey_versions',
    'journey_rules',
    'customer_journeys',
    'journey_milestones',
    'journey_scores',
    'journey_events',
    'journey_recommendations',
    'journey_campaigns',
    'journey_segments',
    'journey_history',
    'journey_settings'
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

INSERT INTO public.journey_settings (location_id)
VALUES ('south-plainfield'), ('oak-tree'), ('lawrenceville')
ON CONFLICT (location_id) DO NOTHING;

INSERT INTO public.journey_stages (location_id, code, name, description, sort_order) VALUES
  (NULL, 'visitor', 'Visitor', 'Website / AI visitor without reservation', 10),
  (NULL, 'first_reservation', 'First Reservation', 'Booked first reservation', 20),
  (NULL, 'first_visit', 'First Visit', 'Completed first visit', 30),
  (NULL, 'returning', 'Returning Customer', 'Returned at least once', 40),
  (NULL, 'frequent', 'Frequent Visitor', 'Regular visits', 50),
  (NULL, 'vip', 'VIP', 'High-value frequent guest', 60),
  (NULL, 'loyal', 'Loyal Customer', 'Strong loyalty engagement', 70),
  (NULL, 'inactive', 'Inactive', 'No recent visits', 80),
  (NULL, 'at_risk', 'At Risk', 'Churn risk elevated', 90),
  (NULL, 'win_back', 'Win-back', 'In win-back outreach', 100),
  (NULL, 'reactivated', 'Reactivated', 'Returned after inactivity', 110),
  (NULL, 'advocate', 'Brand Advocate', 'Reviews / referrals / high advocacy', 120)
ON CONFLICT (location_id, code) DO NOTHING;

INSERT INTO public.journey_rules (location_id, code, name, to_stage, condition, priority) VALUES
  (NULL, 'TO_FIRST_RESERVATION', 'First reservation booked', 'first_reservation',
   '{"field":"reservationCount","op":"gte","value":1}'::jsonb, 10),
  (NULL, 'TO_FIRST_VISIT', 'First visit completed', 'first_visit',
   '{"field":"visitCount","op":"gte","value":1}'::jsonb, 20),
  (NULL, 'TO_RETURNING', 'Returning visits', 'returning',
   '{"field":"visitCount","op":"gte","value":2}'::jsonb, 30),
  (NULL, 'TO_FREQUENT', 'Frequent visitor', 'frequent',
   '{"field":"visitCount","op":"gte","value":4}'::jsonb, 40),
  (NULL, 'TO_VIP', 'VIP threshold', 'vip',
   '{"all":[{"field":"visitCount","op":"gte","value":8},{"field":"isVip","op":"eq","value":true}]}'::jsonb, 50),
  (NULL, 'TO_LOYAL', 'Loyal customer', 'loyal',
   '{"field":"loyaltyPoints","op":"gte","value":100}'::jsonb, 55),
  (NULL, 'TO_INACTIVE', 'Inactive 60d', 'inactive',
   '{"field":"daysSinceLastVisit","op":"gte","value":60}'::jsonb, 70),
  (NULL, 'TO_AT_RISK', 'At risk 90d or cancellations', 'at_risk',
   '{"any":[{"field":"daysSinceLastVisit","op":"gte","value":90},{"field":"cancelCount","op":"gte","value":3}]}'::jsonb, 80),
  (NULL, 'TO_ADVOCATE', 'Advocate via reviews', 'advocate',
   '{"field":"positiveReviews","op":"gte","value":1}'::jsonb, 90)
ON CONFLICT (location_id, code) DO NOTHING;

INSERT INTO public.journey_segments (location_id, code, name, description, condition) VALUES
  (NULL, 'families', 'Families', 'Family / kids dining', '{"field":"familyVisits","op":"gte","value":2}'::jsonb),
  (NULL, 'corporate', 'Corporate', 'Corporate / catering buyers', '{"field":"cateringCount","op":"gte","value":1}'::jsonb),
  (NULL, 'birthday_soon', 'Birthday Soon', 'Birthday within 14 days', '{"field":"birthdayInDays","op":"lte","value":14}'::jsonb),
  (NULL, 'high_value', 'High Value', 'High relationship score', '{"field":"relationshipScore","op":"gte","value":70}'::jsonb)
ON CONFLICT (location_id, code) DO NOTHING;

INSERT INTO public.journey_definitions (location_id, code, name, description, active, graph)
VALUES (
  NULL,
  'DEFAULT_LIFECYCLE',
  'Default Customer Lifecycle',
  'Visitor through advocate with retention branches',
  true,
  '{
    "nodes":[
      {"id":"s1","type":"stage","label":"Visitor","config":{"stage":"visitor"}},
      {"id":"c1","type":"condition","label":"Has reservation?","config":{"field":"reservationCount","op":"gte","value":1}},
      {"id":"s2","type":"stage","label":"First Reservation","config":{"stage":"first_reservation"}},
      {"id":"a1","type":"action","label":"Next best: welcome","config":{"action":"welcome_offer"}},
      {"id":"g1","type":"goal","label":"First visit","config":{"goal":"first_visit"}},
      {"id":"end","type":"end","label":"End"}
    ],
    "edges":[
      {"from":"s1","to":"c1"},
      {"from":"c1","to":"s2","when":"true"},
      {"from":"s2","to":"a1"},
      {"from":"a1","to":"g1"},
      {"from":"g1","to":"end"}
    ]
  }'::jsonb
)
ON CONFLICT (location_id, code) DO NOTHING;
