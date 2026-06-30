-- Update per-location ChefGaa order URLs to current store links.
-- South Plainfield & Oak Tree: order.chefgaa.com (no "s") with order_type
-- Lawrenceville: orders.chefgaa.com (with "s") /menu path

UPDATE public.restaurant_settings
SET order_url = 'https://order.chefgaa.com/store/desi-dhamaka?order_type=106'
WHERE location_id = 'south-plainfield';

UPDATE public.restaurant_settings
SET order_url = 'https://order.chefgaa.com/store/desi-dhamaka?order_type=108'
WHERE location_id = 'oak-tree';

UPDATE public.restaurant_settings
SET order_url = 'https://orders.chefgaa.com/store/desi-dhamaka/menu'
WHERE location_id = 'lawrenceville';
