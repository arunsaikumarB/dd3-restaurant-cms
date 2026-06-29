-- =============================================================================
-- Gallery — add caption, featured, visible (safe additive migration)
-- =============================================================================

ALTER TABLE public.gallery
  ADD COLUMN IF NOT EXISTS caption TEXT;

ALTER TABLE public.gallery
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.gallery
  ADD COLUMN IF NOT EXISTS visible BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS gallery_featured_idx ON public.gallery (featured);
CREATE INDEX IF NOT EXISTS gallery_visible_idx ON public.gallery (visible);
