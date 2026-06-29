-- =============================================================================
-- Reviews — add featured flag (safe additive migration)
-- =============================================================================

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS reviews_featured_idx ON public.reviews (featured);
