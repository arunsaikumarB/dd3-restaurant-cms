-- Sync CMS restaurant_settings.order_url for all three outlets.
-- Safe to re-run: always sets the canonical ChefGaa URLs.

UPDATE public.restaurant_settings
SET order_url = 'https://order.chefgaa.com/store/desi-dhamaka?order_type=106',
    updated_at = NOW()
WHERE location_id = 'south-plainfield';

UPDATE public.restaurant_settings
SET order_url = 'https://order.chefgaa.com/store/desi-dhamaka?order_type=108',
    updated_at = NOW()
WHERE location_id = 'oak-tree';

UPDATE public.restaurant_settings
SET order_url = 'https://orders.chefgaa.com/store/desi-dhamaka/menu',
    updated_at = NOW()
WHERE location_id = 'lawrenceville';

-- Verify:
-- SELECT location_id, order_url FROM public.restaurant_settings ORDER BY location_id;
