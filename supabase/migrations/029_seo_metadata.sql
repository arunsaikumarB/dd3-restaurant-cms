-- =============================================================================
-- SEO metadata CMS (location-scoped, per page_key)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.seo_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key TEXT NOT NULL,
  location_id TEXT NOT NULL CHECK (location_id IN
    ('south-plainfield', 'oak-tree', 'lawrenceville')),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT seo_metadata_page_key_check CHECK (page_key IN (
    'homepage',
    'about',
    'menu',
    'offers',
    'gallery',
    'testimonials',
    'reservation',
    'contact',
    'private-dining',
    'catering',
    'events',
    'custom'
  )),
  CONSTRAINT seo_metadata_location_page_key UNIQUE (location_id, page_key)
);

CREATE INDEX IF NOT EXISTS seo_metadata_location_idx
  ON public.seo_metadata (location_id);

CREATE INDEX IF NOT EXISTS seo_metadata_page_key_idx
  ON public.seo_metadata (page_key);

CREATE OR REPLACE FUNCTION public.set_seo_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS seo_metadata_set_updated_at ON public.seo_metadata;
CREATE TRIGGER seo_metadata_set_updated_at
  BEFORE UPDATE ON public.seo_metadata
  FOR EACH ROW
  EXECUTE FUNCTION public.set_seo_metadata_updated_at();

ALTER TABLE public.seo_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seo_metadata_public_read" ON public.seo_metadata;
CREATE POLICY "seo_metadata_public_read"
  ON public.seo_metadata FOR SELECT
  TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "seo_metadata_authenticated_all" ON public.seo_metadata;
CREATE POLICY "seo_metadata_authenticated_all"
  ON public.seo_metadata FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.seo_metadata TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.seo_metadata TO authenticated;
