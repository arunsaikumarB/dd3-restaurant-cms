-- =============================================================================
-- Google rating stats — the real aggregate rating + review count per
-- location (e.g. 4.2 / 948 reviews), synced from Google Maps via the
-- google-reviews-sync scheduled Netlify function. Powers the "4.9 / 500+
-- Google Reviews" summary on the testimonials page, replacing static copy.
-- =============================================================================

CREATE TABLE public.google_rating_stats (
  location_id TEXT PRIMARY KEY,
  rating NUMERIC(2, 1) NOT NULL CHECK (rating BETWEEN 0 AND 5),
  rating_count INTEGER NOT NULL CHECK (rating_count >= 0),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT google_rating_stats_location_id_check
    CHECK (location_id IN ('south-plainfield', 'oak-tree', 'lawrenceville'))
);

CREATE TRIGGER google_rating_stats_set_updated_at
  BEFORE UPDATE ON public.google_rating_stats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.google_rating_stats ENABLE ROW LEVEL SECURITY;

-- Public read only — writes happen exclusively via the scheduled sync
-- function using the service-role key, which bypasses RLS entirely.
CREATE POLICY "google_rating_stats_public_read"
  ON public.google_rating_stats FOR SELECT
  TO anon, authenticated
  USING (TRUE);
