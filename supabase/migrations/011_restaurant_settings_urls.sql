-- Per-location reservation and order URLs on restaurant_settings.

ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS reservation_url TEXT,
  ADD COLUMN IF NOT EXISTS order_url TEXT;

UPDATE public.restaurant_settings AS rs
SET
  reservation_url = COALESCE(rs.reservation_url, seed.reservation_url),
  order_url = COALESCE(rs.order_url, seed.order_url)
FROM (
  VALUES
    (
      'south-plainfield',
      'https://www.opentable.com/r/desi-dhamaka-south-plainfield',
      'https://orders.chefgaa.com/store/desi-dhamaka-south-plainfield/menu'
    ),
    (
      'oak-tree',
      'https://www.opentable.com/r/desi-dhamaka-oak-tree',
      'https://orders.chefgaa.com/store/desi-dhamaka-oak-tree/menu'
    ),
    (
      'lawrenceville',
      '/reservation',
      'https://orders.chefgaa.com/store/desi-dhamaka/menu'
    )
) AS seed(location_id, reservation_url, order_url)
WHERE rs.location_id = seed.location_id;
