-- Multi-location menu: categories and items scoped by restaurant location.

ALTER TABLE public.menu_categories
  ADD COLUMN location_id TEXT NOT NULL DEFAULT 'lawrenceville';

ALTER TABLE public.menu_categories
  DROP CONSTRAINT menu_categories_slug_key;

ALTER TABLE public.menu_categories
  ADD CONSTRAINT menu_categories_location_slug_key UNIQUE (location_id, slug);

ALTER TABLE public.menu_categories
  ADD CONSTRAINT menu_categories_location_id_check
  CHECK (location_id IN ('south-plainfield', 'oak-tree', 'lawrenceville'));

CREATE INDEX menu_categories_location_id_idx ON public.menu_categories (location_id);
CREATE INDEX menu_categories_location_display_order_idx
  ON public.menu_categories (location_id, display_order);

ALTER TABLE public.menu_items
  ADD COLUMN location_id TEXT NOT NULL DEFAULT 'lawrenceville';

ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_location_id_check
  CHECK (location_id IN ('south-plainfield', 'oak-tree', 'lawrenceville'));

CREATE INDEX menu_items_location_id_idx ON public.menu_items (location_id);
CREATE INDEX menu_items_location_display_order_idx
  ON public.menu_items (location_id, display_order);

-- Align existing items with their category location after backfill.
UPDATE public.menu_items mi
SET location_id = c.location_id
FROM public.menu_categories c
WHERE mi.category_id = c.id;

-- Keep item location_id in sync when category changes.
CREATE OR REPLACE FUNCTION public.sync_menu_item_location_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT location_id INTO NEW.location_id
  FROM public.menu_categories
  WHERE id = NEW.category_id;

  IF NEW.location_id IS NULL THEN
    RAISE EXCEPTION 'menu_items.category_id must reference an existing menu_categories row';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER menu_items_sync_location
  BEFORE INSERT OR UPDATE OF category_id ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_menu_item_location_id();
