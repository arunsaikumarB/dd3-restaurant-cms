-- 025_homepage_hero_ctas.sql
-- Replace cta_text / cta_link with explicit label + URL pairs for hero CTAs.

ALTER TABLE public.homepage_content
  ADD COLUMN IF NOT EXISTS primary_cta_label TEXT,
  ADD COLUMN IF NOT EXISTS primary_cta_url TEXT,
  ADD COLUMN IF NOT EXISTS secondary_cta_label TEXT,
  ADD COLUMN IF NOT EXISTS secondary_cta_url TEXT;

-- Migrate legacy values: URL-like strings become url + default label; otherwise label only.
UPDATE public.homepage_content
SET
  primary_cta_label = CASE
    WHEN TRIM(COALESCE(cta_text, '')) ~* '^(https?://|/)' THEN 'Order Now'
    WHEN NULLIF(TRIM(cta_text), '') IS NOT NULL THEN TRIM(cta_text)
    ELSE 'Order Now'
  END,
  primary_cta_url = CASE
    WHEN TRIM(COALESCE(cta_text, '')) ~* '^(https?://|/)' THEN TRIM(cta_text)
    ELSE NULL
  END,
  secondary_cta_label = CASE
    WHEN TRIM(COALESCE(cta_link, '')) ~* '^(https?://|/)' THEN 'View Menu'
    WHEN NULLIF(TRIM(cta_link), '') IS NOT NULL THEN TRIM(cta_link)
    ELSE 'View Menu'
  END,
  secondary_cta_url = CASE
    WHEN TRIM(COALESCE(cta_link, '')) ~* '^(https?://|/)' THEN NULL
    WHEN TRIM(COALESCE(cta_link, '')) ~* '^/' THEN TRIM(cta_link)
    WHEN NULLIF(TRIM(cta_link), '') IS NOT NULL THEN '/menu'
    ELSE '/menu'
  END;

-- cta_link often stored the order URL under "Secondary CTA" — promote to primary when needed.
UPDATE public.homepage_content
SET primary_cta_url = TRIM(cta_link)
WHERE (primary_cta_url IS NULL OR TRIM(primary_cta_url) = '')
  AND TRIM(COALESCE(cta_link, '')) ~* '^https?://';

-- Authoritative per-location order URLs (fixes mis-assigned Lawrenceville URL on South Plainfield, etc.).
UPDATE public.homepage_content
SET primary_cta_url = 'https://order.chefgaa.com/store/desi-dhamaka?order_type=106'
WHERE location_id = 'south-plainfield';

UPDATE public.homepage_content
SET primary_cta_url = 'https://order.chefgaa.com/store/desi-dhamaka?order_type=108'
WHERE location_id = 'oak-tree';

UPDATE public.homepage_content
SET primary_cta_url = 'https://orders.chefgaa.com/store/desi-dhamaka/menu'
WHERE location_id = 'lawrenceville';

UPDATE public.homepage_content
SET
  primary_cta_label = COALESCE(NULLIF(TRIM(primary_cta_label), ''), 'Order Now'),
  secondary_cta_label = COALESCE(NULLIF(TRIM(secondary_cta_label), ''), 'View Menu'),
  secondary_cta_url = COALESCE(NULLIF(TRIM(secondary_cta_url), ''), '/menu'),
  primary_cta_url = COALESCE(
    NULLIF(TRIM(primary_cta_url), ''),
    CASE location_id
      WHEN 'south-plainfield' THEN 'https://order.chefgaa.com/store/desi-dhamaka?order_type=106'
      WHEN 'oak-tree' THEN 'https://order.chefgaa.com/store/desi-dhamaka?order_type=108'
      WHEN 'lawrenceville' THEN 'https://orders.chefgaa.com/store/desi-dhamaka/menu'
      ELSE 'https://order.chefgaa.com/store/desi-dhamaka?order_type=106'
    END
  );

ALTER TABLE public.homepage_content
  DROP COLUMN IF EXISTS cta_text,
  DROP COLUMN IF EXISTS cta_link;
