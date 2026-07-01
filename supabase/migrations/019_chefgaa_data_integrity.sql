-- ChefGaa data integrity: archive legacy CMS menu rows, soft-delete support, init tracking.
-- Legacy rows = imported_from_chefgaa FALSE AND chefgaa external id IS NULL.
-- Never archives/deletes rows with manual_override = TRUE.

-- ---------------------------------------------------------------------------
-- Soft-delete when ChefGaa removes catalog entries
-- ---------------------------------------------------------------------------
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS chefgaa_removed_at TIMESTAMPTZ;

ALTER TABLE public.menu_categories
  ADD COLUMN IF NOT EXISTS chefgaa_removed_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- Per-location ChefGaa initialization + catalog counts
-- ---------------------------------------------------------------------------
ALTER TABLE public.chefgaa_location_config
  ADD COLUMN IF NOT EXISTS chefgaa_initialized BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS chefgaa_catalog_category_count INTEGER,
  ADD COLUMN IF NOT EXISTS chefgaa_catalog_item_count INTEGER;

-- ---------------------------------------------------------------------------
-- Archive tables (preserve pre-ChefGaa CMS data)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_items_legacy_archive (
  LIKE public.menu_items INCLUDING DEFAULTS
);

ALTER TABLE public.menu_items_legacy_archive
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS archive_reason TEXT NOT NULL DEFAULT 'pre_chefgaa_cms';

CREATE TABLE IF NOT EXISTS public.menu_categories_legacy_archive (
  LIKE public.menu_categories INCLUDING DEFAULTS
);

ALTER TABLE public.menu_categories_legacy_archive
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS archive_reason TEXT NOT NULL DEFAULT 'pre_chefgaa_cms';

CREATE INDEX IF NOT EXISTS menu_items_legacy_archive_location_idx
  ON public.menu_items_legacy_archive (location_id, archived_at DESC);

CREATE INDEX IF NOT EXISTS menu_categories_legacy_archive_location_idx
  ON public.menu_categories_legacy_archive (location_id, archived_at DESC);

-- ---------------------------------------------------------------------------
-- Archive + remove legacy menu items (per location)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.archive_legacy_menu_items(p_location_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  INSERT INTO public.menu_items_legacy_archive (
    id,
    category_id,
    name,
    description,
    price,
    image,
    veg,
    popular,
    chef_special,
    spice_level,
    status,
    display_order,
    created_at,
    updated_at,
    location_id,
    chefgaa_outlet_item_id,
    chefgaa_catalog_item_id,
    chefgaa_content_hash,
    imported_from_chefgaa,
    chefgaa_last_synced_at,
    manual_override,
    chefgaa_removed_at,
    archived_at,
    archive_reason
  )
  SELECT
    mi.id,
    mi.category_id,
    mi.name,
    mi.description,
    mi.price,
    mi.image,
    mi.veg,
    mi.popular,
    mi.chef_special,
    mi.spice_level,
    mi.status,
    mi.display_order,
    mi.created_at,
    mi.updated_at,
    mi.location_id,
    mi.chefgaa_outlet_item_id,
    mi.chefgaa_catalog_item_id,
    mi.chefgaa_content_hash,
    mi.imported_from_chefgaa,
    mi.chefgaa_last_synced_at,
    mi.manual_override,
    mi.chefgaa_removed_at,
    NOW(),
    'migration_019_pre_chefgaa_cms'
  FROM public.menu_items mi
  WHERE mi.location_id = p_location_id
    AND mi.imported_from_chefgaa = FALSE
    AND mi.chefgaa_outlet_item_id IS NULL
    AND mi.manual_override = FALSE;

  GET DIAGNOSTICS archived_count = ROW_COUNT;

  DELETE FROM public.menu_items mi
  WHERE mi.location_id = p_location_id
    AND mi.imported_from_chefgaa = FALSE
    AND mi.chefgaa_outlet_item_id IS NULL
    AND mi.manual_override = FALSE;

  RETURN archived_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- Archive + remove legacy categories (only empty of remaining items)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.archive_legacy_menu_categories(p_location_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  INSERT INTO public.menu_categories_legacy_archive (
    id,
    name,
    slug,
    image,
    display_order,
    status,
    created_at,
    updated_at,
    location_id,
    chefgaa_category_id,
    chefgaa_content_hash,
    imported_from_chefgaa,
    chefgaa_last_synced_at,
    chefgaa_removed_at,
    archived_at,
    archive_reason
  )
  SELECT
    mc.id,
    mc.name,
    mc.slug,
    mc.image,
    mc.display_order,
    mc.status,
    mc.created_at,
    mc.updated_at,
    mc.location_id,
    mc.chefgaa_category_id,
    mc.chefgaa_content_hash,
    mc.imported_from_chefgaa,
    mc.chefgaa_last_synced_at,
    mc.chefgaa_removed_at,
    NOW(),
    'migration_019_pre_chefgaa_cms'
  FROM public.menu_categories mc
  WHERE mc.location_id = p_location_id
    AND mc.imported_from_chefgaa = FALSE
    AND mc.chefgaa_category_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.menu_items mi WHERE mi.category_id = mc.id
    );

  GET DIAGNOSTICS archived_count = ROW_COUNT;

  DELETE FROM public.menu_categories mc
  WHERE mc.location_id = p_location_id
    AND mc.imported_from_chefgaa = FALSE
    AND mc.chefgaa_category_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.menu_items mi WHERE mi.category_id = mc.id
    );

  RETURN archived_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- Apply cleanup for all restaurant locations
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  loc TEXT;
  items_archived INTEGER;
  cats_archived INTEGER;
BEGIN
  FOREACH loc IN ARRAY ARRAY['south-plainfield', 'oak-tree', 'lawrenceville']
  LOOP
    items_archived := public.archive_legacy_menu_items(loc);
    cats_archived := public.archive_legacy_menu_categories(loc);
    RAISE NOTICE 'Location %: archived % legacy items, % legacy categories', loc, items_archived, cats_archived;
  END LOOP;
END;
$$;

-- Mark locations with ChefGaa catalog as initialized; store current imported counts.
UPDATE public.chefgaa_location_config cfg
SET
  chefgaa_initialized = TRUE,
  chefgaa_catalog_item_count = counts.item_count,
  chefgaa_catalog_category_count = counts.category_count
FROM (
  SELECT
    l.location_id,
    COALESCE(i.item_count, 0) AS item_count,
    COALESCE(c.category_count, 0) AS category_count
  FROM public.chefgaa_location_config l
  LEFT JOIN (
    SELECT location_id, COUNT(*)::INTEGER AS item_count
    FROM public.menu_items
    WHERE imported_from_chefgaa = TRUE
      AND chefgaa_outlet_item_id IS NOT NULL
    GROUP BY location_id
  ) i ON i.location_id = l.location_id
  LEFT JOIN (
    SELECT location_id, COUNT(*)::INTEGER AS category_count
    FROM public.menu_categories
    WHERE imported_from_chefgaa = TRUE
      AND chefgaa_category_id IS NOT NULL
    GROUP BY location_id
  ) c ON c.location_id = l.location_id
) counts
WHERE cfg.location_id = counts.location_id
  AND counts.item_count > 0;

-- RLS: admin read-only on archives
ALTER TABLE public.menu_items_legacy_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories_legacy_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_items_legacy_archive_admin_read"
  ON public.menu_items_legacy_archive FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "menu_categories_legacy_archive_admin_read"
  ON public.menu_categories_legacy_archive FOR SELECT TO authenticated
  USING (public.is_admin());
