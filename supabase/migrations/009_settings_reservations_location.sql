-- Per-location restaurant settings and reservations.
-- Idempotent: safe to re-run after a partial/previous apply.

ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS location_id TEXT NOT NULL DEFAULT 'lawrenceville';

ALTER TABLE public.restaurant_settings
  DROP CONSTRAINT IF EXISTS restaurant_settings_location_id_check;
ALTER TABLE public.restaurant_settings
  ADD CONSTRAINT restaurant_settings_location_id_check
  CHECK (location_id IN ('south-plainfield', 'oak-tree', 'lawrenceville'));

ALTER TABLE public.restaurant_settings
  DROP CONSTRAINT IF EXISTS restaurant_settings_location_id_key;
ALTER TABLE public.restaurant_settings
  ADD CONSTRAINT restaurant_settings_location_id_key UNIQUE (location_id);

CREATE INDEX IF NOT EXISTS restaurant_settings_location_id_idx
  ON public.restaurant_settings (location_id);

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
    )
) AS seed(location_id, restaurant_name, address, google_maps, opening_hours)
WHERE rs.location_id = 'lawrenceville'
  AND NOT EXISTS (
    SELECT 1
    FROM public.restaurant_settings existing
    WHERE existing.location_id = seed.location_id
  );

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS location_id TEXT NOT NULL DEFAULT 'lawrenceville';

ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_location_id_check;
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_location_id_check
  CHECK (location_id IN ('south-plainfield', 'oak-tree', 'lawrenceville'));

CREATE INDEX IF NOT EXISTS reservations_location_id_idx
  ON public.reservations (location_id);
CREATE INDEX IF NOT EXISTS reservations_location_date_idx
  ON public.reservations (location_id, date);
