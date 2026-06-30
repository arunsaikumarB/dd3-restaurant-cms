-- =============================================================================
-- Location isolation hardening (safe to run after 007–009 or on a fresh partial DB)
-- Ensures one logical dataset per location and DB-level category/item alignment.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Idempotent location_id columns + constraints
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'menu_categories' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE public.menu_categories
      ADD COLUMN location_id TEXT NOT NULL DEFAULT 'lawrenceville';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'menu_categories_location_slug_key'
  ) THEN
    ALTER TABLE public.menu_categories DROP CONSTRAINT IF EXISTS menu_categories_slug_key;
    ALTER TABLE public.menu_categories
      ADD CONSTRAINT menu_categories_location_slug_key UNIQUE (location_id, slug);
  END IF;
END $$;

ALTER TABLE public.menu_categories DROP CONSTRAINT IF EXISTS menu_categories_location_id_check;
ALTER TABLE public.menu_categories
  ADD CONSTRAINT menu_categories_location_id_check
  CHECK (location_id IN ('south-plainfield', 'oak-tree', 'lawrenceville'));

CREATE INDEX IF NOT EXISTS menu_categories_location_id_idx ON public.menu_categories (location_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'menu_items' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE public.menu_items
      ADD COLUMN location_id TEXT NOT NULL DEFAULT 'lawrenceville';
  END IF;
END $$;

ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS menu_items_location_id_check;
ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_location_id_check
  CHECK (location_id IN ('south-plainfield', 'oak-tree', 'lawrenceville'));

CREATE INDEX IF NOT EXISTS menu_items_location_id_idx ON public.menu_items (location_id);

UPDATE public.menu_items mi
SET location_id = c.location_id
FROM public.menu_categories c
WHERE mi.category_id = c.id
  AND mi.location_id IS DISTINCT FROM c.location_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'offers' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE public.offers
      ADD COLUMN location_id TEXT NOT NULL DEFAULT 'lawrenceville';
  END IF;
END $$;

ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_location_id_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_location_id_check
  CHECK (location_id IN ('south-plainfield', 'oak-tree', 'lawrenceville'));

CREATE INDEX IF NOT EXISTS offers_location_id_idx ON public.offers (location_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurant_settings' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE public.restaurant_settings
      ADD COLUMN location_id TEXT NOT NULL DEFAULT 'lawrenceville';
  END IF;
END $$;

ALTER TABLE public.restaurant_settings DROP CONSTRAINT IF EXISTS restaurant_settings_location_id_check;
ALTER TABLE public.restaurant_settings
  ADD CONSTRAINT restaurant_settings_location_id_check
  CHECK (location_id IN ('south-plainfield', 'oak-tree', 'lawrenceville'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_name = 'restaurant_settings_location_id_key'
  ) THEN
    ALTER TABLE public.restaurant_settings
      ADD CONSTRAINT restaurant_settings_location_id_key UNIQUE (location_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS restaurant_settings_location_id_idx ON public.restaurant_settings (location_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reservations' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE public.reservations
      ADD COLUMN location_id TEXT NOT NULL DEFAULT 'lawrenceville';
  END IF;
END $$;

ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_location_id_check;
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_location_id_check
  CHECK (location_id IN ('south-plainfield', 'oak-tree', 'lawrenceville'));

CREATE INDEX IF NOT EXISTS reservations_location_id_idx ON public.reservations (location_id);

-- ---------------------------------------------------------------------------
-- 2. One restaurant_settings row per location
-- ---------------------------------------------------------------------------
INSERT INTO public.restaurant_settings (
  location_id,
  restaurant_name,
  phone,
  email,
  address,
  google_maps,
  opening_hours,
  facebook,
  instagram,
  youtube,
  logo,
  favicon
)
SELECT
  seed.location_id,
  seed.restaurant_name,
  rs.phone,
  rs.email,
  seed.address,
  seed.google_maps,
  seed.opening_hours,
  rs.facebook,
  rs.instagram,
  rs.youtube,
  rs.logo,
  rs.favicon
FROM public.restaurant_settings rs
CROSS JOIN (
  VALUES
    (
      'south-plainfield',
      'Desi Dhamaka — South Plainfield',
      '4941 Stelton Rd, South Plainfield, NJ 07080',
      'https://www.google.com/maps?q=4941+Stelton+Rd+South+Plainfield+NJ+07080&output=embed',
      '{"weekday":"11:00 AM - 10:00 PM","weekend":"11:00 AM - 11:00 PM","sunday":"11:00 AM - 9:30 PM"}'::jsonb
    ),
    (
      'oak-tree',
      'Desi Dhamaka — Oak Tree',
      '1676 Oak Tree Rd, Edison, NJ 08820',
      'https://www.google.com/maps?q=1676+Oak+Tree+Rd+Edison+NJ+08820&output=embed',
      '{"weekday":"11:30 AM - 10:00 PM","weekend":"11:30 AM - 11:30 PM","sunday":"11:30 AM - 10:00 PM"}'::jsonb
    ),
    (
      'lawrenceville',
      'Desi Dhamaka — Lawrenceville',
      '2950 Brunswick Pike, Lawrenceville, NJ 08648',
      'https://www.google.com/maps?q=2950+Brunswick+Pike+Lawrenceville+NJ+08648&output=embed',
      '{"weekday":"11:00 AM - 10:00 PM","weekend":"11:00 AM - 11:00 PM","sunday":"11:00 AM - 9:30 PM"}'::jsonb
    )
) AS seed(location_id, restaurant_name, address, google_maps, opening_hours)
WHERE rs.location_id = 'lawrenceville'
  AND NOT EXISTS (
    SELECT 1
    FROM public.restaurant_settings existing
    WHERE existing.location_id = seed.location_id
  );

-- ---------------------------------------------------------------------------
-- 3. Clone menu categories + items into empty locations (from lawrenceville)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clone_menu_location(
  p_source TEXT,
  p_target TEXT
) RETURNS VOID AS $$
DECLARE
  cat RECORD;
  new_cat_id UUID;
BEGIN
  IF p_source = p_target THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.menu_categories WHERE location_id = p_target LIMIT 1) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.menu_categories WHERE location_id = p_source LIMIT 1) THEN
    RETURN;
  END IF;

  FOR cat IN
    SELECT id, name, slug, image, display_order, status
    FROM public.menu_categories
    WHERE location_id = p_source
    ORDER BY display_order, name
  LOOP
    INSERT INTO public.menu_categories (
      location_id, name, slug, image, display_order, status
    )
    VALUES (
      p_target, cat.name, cat.slug, cat.image, cat.display_order, cat.status
    )
    RETURNING id INTO new_cat_id;

    INSERT INTO public.menu_items (
      location_id,
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
      display_order
    )
    SELECT
      p_target,
      new_cat_id,
      mi.name,
      mi.description,
      mi.price,
      mi.image,
      mi.veg,
      mi.popular,
      mi.chef_special,
      mi.spice_level,
      mi.status,
      mi.display_order
    FROM public.menu_items mi
    WHERE mi.category_id = cat.id
      AND mi.location_id = p_source;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT public.clone_menu_location('lawrenceville', 'south-plainfield');
SELECT public.clone_menu_location('lawrenceville', 'oak-tree');

-- ---------------------------------------------------------------------------
-- 4. Clone offers into empty locations (from lawrenceville)
-- ---------------------------------------------------------------------------
INSERT INTO public.offers (
  location_id,
  title,
  description,
  banner,
  discount,
  start_date,
  end_date,
  active
)
SELECT
  target.location_id,
  o.title,
  o.description,
  o.banner,
  o.discount,
  o.start_date,
  o.end_date,
  o.active
FROM public.offers o
CROSS JOIN (
  VALUES ('south-plainfield'), ('oak-tree')
) AS target(location_id)
WHERE o.location_id = 'lawrenceville'
  AND NOT EXISTS (
    SELECT 1 FROM public.offers existing WHERE existing.location_id = target.location_id
  );

-- ---------------------------------------------------------------------------
-- 5. Enforce menu item ↔ category location alignment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_menu_item_location_id()
RETURNS TRIGGER AS $$
DECLARE
  cat_location TEXT;
BEGIN
  SELECT location_id INTO cat_location
  FROM public.menu_categories
  WHERE id = NEW.category_id;

  IF cat_location IS NULL THEN
    RAISE EXCEPTION 'menu_items.category_id must reference an existing menu_categories row';
  END IF;

  IF NEW.location_id IS NOT NULL AND NEW.location_id <> cat_location THEN
    RAISE EXCEPTION 'menu_items.location_id (%) must match menu_categories.location_id (%)',
      NEW.location_id, cat_location;
  END IF;

  NEW.location_id := cat_location;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS menu_items_sync_location ON public.menu_items;
CREATE TRIGGER menu_items_sync_location
  BEFORE INSERT OR UPDATE OF category_id, location_id ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_menu_item_location_id();
