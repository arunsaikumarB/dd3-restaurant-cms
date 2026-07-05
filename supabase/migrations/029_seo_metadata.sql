-- =============================================================================
-- SEO metadata CMS (location-scoped, per page_key)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.seo_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL CHECK (location_id IN
    ('south-plainfield', 'oak-tree', 'lawrenceville')),
  page_key TEXT NOT NULL CHECK (page_key IN (
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
  seo_title TEXT,
  meta_description TEXT,
  focus_keyword TEXT,
  secondary_keywords TEXT[] DEFAULT '{}',
  canonical_url TEXT,
  slug TEXT,
  robots TEXT DEFAULT 'index',
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  og_location TEXT,
  twitter_title TEXT,
  twitter_description TEXT,
  twitter_image TEXT,
  schema_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  h1 TEXT,
  h2 JSONB NOT NULL DEFAULT '[]'::jsonb,
  h3 JSONB NOT NULL DEFAULT '[]'::jsonb,
  seo_intro TEXT,
  seo_footer_content TEXT,
  conclusion TEXT,
  faq JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT seo_metadata_location_page_key UNIQUE (location_id, page_key)
);

CREATE INDEX IF NOT EXISTS seo_metadata_location_idx
  ON public.seo_metadata (location_id);

CREATE INDEX IF NOT EXISTS seo_metadata_page_key_idx
  ON public.seo_metadata (page_key);

CREATE INDEX IF NOT EXISTS seo_metadata_location_page_idx
  ON public.seo_metadata (location_id, page_key);

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

DROP POLICY IF EXISTS "seo_metadata_admin_write" ON public.seo_metadata;
CREATE POLICY "seo_metadata_admin_write"
  ON public.seo_metadata FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "seo_metadata_admin_update" ON public.seo_metadata;
CREATE POLICY "seo_metadata_admin_update"
  ON public.seo_metadata FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "seo_metadata_admin_delete" ON public.seo_metadata;
CREATE POLICY "seo_metadata_admin_delete"
  ON public.seo_metadata FOR DELETE
  TO authenticated
  USING (public.is_admin());

GRANT SELECT ON public.seo_metadata TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.seo_metadata TO authenticated;
