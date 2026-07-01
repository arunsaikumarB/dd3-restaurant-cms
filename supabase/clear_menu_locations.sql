-- Clear menu data for all three Desi Dhamaka locations.
-- Run this FIRST in Supabase SQL Editor before running the per-location seed files.

BEGIN;

DELETE FROM public.menu_items
WHERE location_id IN ('south-plainfield', 'oak-tree', 'lawrenceville');

DELETE FROM public.menu_categories
WHERE location_id IN ('south-plainfield', 'oak-tree', 'lawrenceville');

COMMIT;

-- Verify tables are empty:
-- SELECT location_id, count(*) FROM public.menu_items GROUP BY location_id;
-- SELECT location_id, count(*) FROM public.menu_categories GROUP BY location_id;
