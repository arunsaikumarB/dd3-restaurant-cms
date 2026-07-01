-- Gallery CMS redesign: title, page, expanded sections

ALTER TABLE public.gallery
ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE public.gallery
ADD COLUMN IF NOT EXISTS page TEXT NOT NULL DEFAULT 'home';

ALTER TABLE public.gallery
ALTER COLUMN location_id SET DEFAULT 'all';

ALTER TABLE public.gallery
ALTER COLUMN section SET DEFAULT 'general';

ALTER TABLE public.gallery
DROP CONSTRAINT IF EXISTS gallery_location_id_check;

ALTER TABLE public.gallery
DROP CONSTRAINT IF EXISTS gallery_location_check;

ALTER TABLE public.gallery
ADD CONSTRAINT gallery_location_check
CHECK (location_id IN (
  'south-plainfield',
  'oak-tree',
  'lawrenceville',
  'all'
));

ALTER TABLE public.gallery
DROP CONSTRAINT IF EXISTS gallery_section_check;

ALTER TABLE public.gallery
ADD CONSTRAINT gallery_section_check
CHECK (section IN (
  'hero_background',
  'home_about_food',
  'home_about_interior',
  'ambience',
  'choose_experience_menu',
  'choose_experience_order',
  'choose_experience_visit',
  'about_hero',
  'about_tradition',
  'about_flavours',
  'about_crafted',
  'about_journey',
  'menu_hero',
  'offers_hero',
  'catering_hero',
  'catering_corporate',
  'catering_wedding',
  'catering_birthday',
  'catering_live',
  'catering_custom',
  'parties_hero',
  'parties_gallery',
  'testimonials_hero',
  'contact_hero',
  'general',
  'home_about',
  'about_story',
  'catering',
  'parties',
  'hero'
));

CREATE INDEX IF NOT EXISTS idx_gallery_page ON public.gallery (page);

COMMENT ON COLUMN public.gallery.title IS 'Display title for card overlays (e.g. Reception, Private Dining)';
COMMENT ON COLUMN public.gallery.page IS 'CMS page grouping: home, about, menu, etc.';
