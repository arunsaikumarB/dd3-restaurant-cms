-- 026_homepage_hero_local_video.sql
-- Serve hero video from Netlify static assets (public/media/hero.mp4), not Supabase Storage.
-- Prerequisite: deploy the site build containing /media/hero.mp4 before running this migration.

UPDATE public.homepage_content
SET
  hero_video = '/media/hero.mp4',
  hero_image = COALESCE(NULLIF(TRIM(hero_image), ''), '/hero/hero-poster.jpg');
