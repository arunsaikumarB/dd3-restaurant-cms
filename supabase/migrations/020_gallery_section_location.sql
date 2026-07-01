-- Gallery section + location targeting for CMS-driven website images

ALTER TABLE public.gallery
ADD COLUMN IF NOT EXISTS location_id TEXT NOT NULL DEFAULT 'south-plainfield';

ALTER TABLE public.gallery
ADD COLUMN IF NOT EXISTS section TEXT NOT NULL DEFAULT 'general';

ALTER TABLE public.gallery
DROP CONSTRAINT IF EXISTS gallery_location_id_check;

ALTER TABLE public.gallery
ADD CONSTRAINT gallery_location_id_check
CHECK (location_id IN (
  'south-plainfield', 'oak-tree', 'lawrenceville', 'all'
));

ALTER TABLE public.gallery
DROP CONSTRAINT IF EXISTS gallery_section_check;

ALTER TABLE public.gallery
ADD CONSTRAINT gallery_section_check
CHECK (section IN (
  'ambience',
  'home_about',
  'about_hero',
  'about_story',
  'catering',
  'parties',
  'hero',
  'general'
));

CREATE INDEX IF NOT EXISTS idx_gallery_section ON public.gallery (section);
CREATE INDEX IF NOT EXISTS idx_gallery_location_id ON public.gallery (location_id);
CREATE INDEX IF NOT EXISTS idx_gallery_section_location ON public.gallery (section, location_id);

COMMENT ON COLUMN public.gallery.section IS 'Website placement: ambience, home_about, about_hero, about_story, catering, parties, hero, general';
COMMENT ON COLUMN public.gallery.location_id IS 'Target location or all for every location';
