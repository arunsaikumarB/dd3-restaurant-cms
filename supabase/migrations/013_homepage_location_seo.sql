-- Per-location homepage content and restaurant SEO fields.

ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_keywords TEXT;

ALTER TABLE public.homepage_content
  ADD COLUMN IF NOT EXISTS location_id TEXT;

UPDATE public.homepage_content
SET location_id = 'lawrenceville'
WHERE location_id IS NULL;

ALTER TABLE public.homepage_content
  ALTER COLUMN location_id SET DEFAULT 'lawrenceville';

ALTER TABLE public.homepage_content
  ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE public.homepage_content
  DROP CONSTRAINT IF EXISTS homepage_content_location_id_check;

ALTER TABLE public.homepage_content
  ADD CONSTRAINT homepage_content_location_id_check
  CHECK (location_id IN ('south-plainfield', 'oak-tree', 'lawrenceville'));

CREATE UNIQUE INDEX IF NOT EXISTS homepage_content_location_id_key
  ON public.homepage_content (location_id);
