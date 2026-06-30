-- ============================================================
-- Clone South Plainfield menu to oak-tree and lawrenceville.
-- Schema-correct: copies name/slug/image/display_order/status,
-- resolves target category by slug, sets location_id explicitly
-- (required by the menu_items_sync_location trigger).
-- Idempotent: re-running will not duplicate categories or items.
-- Run AFTER supabase/seed_menu.sql has populated south-plainfield.
-- ============================================================

BEGIN;

-- ----------------------------------------------------------------
-- OAK TREE
-- ----------------------------------------------------------------
INSERT INTO public.menu_categories (name, slug, image, display_order, status, location_id)
SELECT name, slug, image, display_order, status, 'oak-tree'
FROM public.menu_categories
WHERE location_id = 'south-plainfield'
ON CONFLICT (location_id, slug) DO NOTHING;

INSERT INTO public.menu_items
  (category_id, name, description, price, image, veg, popular, chef_special, spice_level, status, display_order, location_id)
SELECT tgt.id, mi.name, mi.description, mi.price, mi.image, mi.veg, mi.popular,
       mi.chef_special, mi.spice_level, mi.status, mi.display_order, 'oak-tree'
FROM public.menu_items mi
JOIN public.menu_categories src ON src.id = mi.category_id AND src.location_id = 'south-plainfield'
JOIN public.menu_categories tgt ON tgt.location_id = 'oak-tree' AND tgt.slug = src.slug
WHERE mi.location_id = 'south-plainfield'
  AND NOT EXISTS (
    SELECT 1 FROM public.menu_items x
    JOIN public.menu_categories xc ON xc.id = x.category_id
    WHERE xc.location_id = 'oak-tree' AND xc.slug = src.slug AND x.name = mi.name
  );

-- ----------------------------------------------------------------
-- LAWRENCEVILLE
-- ----------------------------------------------------------------
INSERT INTO public.menu_categories (name, slug, image, display_order, status, location_id)
SELECT name, slug, image, display_order, status, 'lawrenceville'
FROM public.menu_categories
WHERE location_id = 'south-plainfield'
ON CONFLICT (location_id, slug) DO NOTHING;

INSERT INTO public.menu_items
  (category_id, name, description, price, image, veg, popular, chef_special, spice_level, status, display_order, location_id)
SELECT tgt.id, mi.name, mi.description, mi.price, mi.image, mi.veg, mi.popular,
       mi.chef_special, mi.spice_level, mi.status, mi.display_order, 'lawrenceville'
FROM public.menu_items mi
JOIN public.menu_categories src ON src.id = mi.category_id AND src.location_id = 'south-plainfield'
JOIN public.menu_categories tgt ON tgt.location_id = 'lawrenceville' AND tgt.slug = src.slug
WHERE mi.location_id = 'south-plainfield'
  AND NOT EXISTS (
    SELECT 1 FROM public.menu_items x
    JOIN public.menu_categories xc ON xc.id = x.category_id
    WHERE xc.location_id = 'lawrenceville' AND xc.slug = src.slug AND x.name = mi.name
  );

COMMIT;

-- Verify (expect 20 / 20 / 20 categories and 377 / 377 / 377 items):
-- SELECT location_id, count(*) FROM public.menu_categories GROUP BY 1 ORDER BY 1;
-- SELECT location_id, count(*) FROM public.menu_items      GROUP BY 1 ORDER BY 1;
