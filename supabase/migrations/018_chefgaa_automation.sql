-- Phase D: ChefGaa production automation (locking, queue, notifications, health, cache revision)

ALTER TABLE public.chefgaa_location_config
  ADD COLUMN IF NOT EXISTS catalog_revision BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS api_health_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (api_health_status IN ('unknown', 'healthy', 'warning', 'offline', 'critical')),
  ADD COLUMN IF NOT EXISTS critical_alert BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_health_check_at TIMESTAMPTZ;

-- Singleton sync lock (prevents overlapping orchestration runs)
CREATE TABLE IF NOT EXISTS public.chefgaa_sync_lock (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  lock_holder TEXT,
  locked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

INSERT INTO public.chefgaa_sync_lock (id, locked)
VALUES (1, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Manual sync queue (processed after current run completes)
CREATE TABLE IF NOT EXISTS public.chefgaa_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT,
  trigger TEXT NOT NULL CHECK (trigger IN ('manual', 'scheduled', 'retry')),
  requested_by TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  result_message TEXT
);

CREATE INDEX IF NOT EXISTS chefgaa_sync_queue_pending_idx
  ON public.chefgaa_sync_queue (status, created_at)
  WHERE status = 'pending';

-- Production notification events
CREATE TABLE IF NOT EXISTS public.chefgaa_sync_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  location_id TEXT,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'success', 'warning', 'error', 'critical')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chefgaa_sync_notifications_created_idx
  ON public.chefgaa_sync_notifications (created_at DESC);

-- API health check audit
CREATE TABLE IF NOT EXISTS public.chefgaa_api_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'offline')),
  response_time_ms INTEGER,
  auth_ok BOOLEAN,
  data_received BOOLEAN,
  error_message TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chefgaa_api_health_checks_location_idx
  ON public.chefgaa_api_health_checks (location_id, checked_at DESC);

-- Default scheduled sync interval for all locations
UPDATE public.chefgaa_location_config
SET sync_schedule = '15m'
WHERE sync_schedule = 'manual';

-- RLS: admin read-only (writes via service role)
ALTER TABLE public.chefgaa_sync_lock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chefgaa_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chefgaa_sync_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chefgaa_api_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chefgaa_sync_lock_admin_read"
  ON public.chefgaa_sync_lock FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "chefgaa_sync_queue_admin_read"
  ON public.chefgaa_sync_queue FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "chefgaa_sync_notifications_admin_read"
  ON public.chefgaa_sync_notifications FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "chefgaa_api_health_checks_admin_read"
  ON public.chefgaa_api_health_checks FOR SELECT TO authenticated
  USING (public.is_admin());
