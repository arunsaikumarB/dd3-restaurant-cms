-- ChefGaa POS integration: external IDs, sync audit, per-location config.

-- ---------------------------------------------------------------------------
-- Per-location POS connection metadata (no API secrets)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chefgaa_location_config (
  location_id TEXT PRIMARY KEY,
  api_version TEXT NOT NULL CHECK (api_version IN ('legacy', 'v2')),
  legacy_outlet_id INTEGER,
  legacy_partner_id INTEGER NOT NULL DEFAULT 1,
  legacy_order_type_id INTEGER,
  v2_tenant_id UUID,
  v2_store_id UUID,
  v2_platform_slug TEXT,
  sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sync_schedule TEXT NOT NULL DEFAULT 'manual'
    CHECK (sync_schedule IN ('manual', '15m', 'hourly', 'daily')),
  manual_override_mode BOOLEAN NOT NULL DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_duration_ms INTEGER,
  last_sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER chefgaa_location_config_set_updated_at
  BEFORE UPDATE ON public.chefgaa_location_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Sync audit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chefgaa_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,
  trigger TEXT NOT NULL CHECK (trigger IN ('manual', 'scheduled', 'retry')),
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  categories_created INTEGER NOT NULL DEFAULT 0,
  categories_updated INTEGER NOT NULL DEFAULT 0,
  categories_deactivated INTEGER NOT NULL DEFAULT 0,
  items_created INTEGER NOT NULL DEFAULT 0,
  items_updated INTEGER NOT NULL DEFAULT 0,
  items_deactivated INTEGER NOT NULL DEFAULT 0,
  prices_changed INTEGER NOT NULL DEFAULT 0,
  items_failed INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS chefgaa_sync_runs_location_started_idx
  ON public.chefgaa_sync_runs (location_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.chefgaa_sync_run_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.chefgaa_sync_runs (id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chefgaa_sync_run_events_run_id_idx
  ON public.chefgaa_sync_run_events (run_id);

-- ---------------------------------------------------------------------------
-- Menu catalog ChefGaa columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.menu_categories
  ADD COLUMN IF NOT EXISTS chefgaa_category_id TEXT,
  ADD COLUMN IF NOT EXISTS chefgaa_content_hash TEXT,
  ADD COLUMN IF NOT EXISTS imported_from_chefgaa BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS chefgaa_last_synced_at TIMESTAMPTZ;

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS chefgaa_outlet_item_id TEXT,
  ADD COLUMN IF NOT EXISTS chefgaa_catalog_item_id TEXT,
  ADD COLUMN IF NOT EXISTS chefgaa_content_hash TEXT,
  ADD COLUMN IF NOT EXISTS imported_from_chefgaa BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS chefgaa_last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manual_override BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS menu_categories_location_chefgaa_id_idx
  ON public.menu_categories (location_id, chefgaa_category_id)
  WHERE chefgaa_category_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS menu_items_location_chefgaa_outlet_item_idx
  ON public.menu_items (location_id, chefgaa_outlet_item_id)
  WHERE chefgaa_outlet_item_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Seed location config
-- ---------------------------------------------------------------------------
INSERT INTO public.chefgaa_location_config (
  location_id,
  api_version,
  legacy_outlet_id,
  legacy_partner_id,
  legacy_order_type_id,
  v2_tenant_id,
  v2_store_id,
  v2_platform_slug
)
VALUES
  ('south-plainfield', 'legacy', 70, 1, 106, NULL, NULL, NULL),
  ('oak-tree', 'legacy', 71, 1, 108, NULL, NULL, NULL),
  (
    'lawrenceville',
    'v2',
    NULL,
    1,
    NULL,
    'bc3e7543-c8d6-4d77-bd87-d30cda29ca51'::uuid,
    'b8e4c76f-0534-47e8-952f-495e60959158'::uuid,
    'online-ordering'
  )
ON CONFLICT (location_id) DO UPDATE SET
  api_version = EXCLUDED.api_version,
  legacy_outlet_id = EXCLUDED.legacy_outlet_id,
  legacy_order_type_id = EXCLUDED.legacy_order_type_id,
  v2_tenant_id = EXCLUDED.v2_tenant_id,
  v2_store_id = EXCLUDED.v2_store_id,
  v2_platform_slug = EXCLUDED.v2_platform_slug;

-- ---------------------------------------------------------------------------
-- RLS (admin read; writes via service role)
-- ---------------------------------------------------------------------------
ALTER TABLE public.chefgaa_location_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chefgaa_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chefgaa_sync_run_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chefgaa_location_config_admin_read"
  ON public.chefgaa_location_config FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "chefgaa_sync_runs_admin_read"
  ON public.chefgaa_sync_runs FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "chefgaa_sync_run_events_admin_read"
  ON public.chefgaa_sync_run_events FOR SELECT
  TO authenticated
  USING (public.is_admin());
