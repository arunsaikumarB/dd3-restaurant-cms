-- =============================================================================
-- Google reviews — synced from Google Maps via the google-reviews-sync
-- scheduled Netlify function (netlify/functions/google-reviews-sync.mts).
-- Only 5-star reviews with non-empty text are ever written here.
-- =============================================================================

CREATE TABLE public.google_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,
  google_review_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL,
  review_time TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'Google Review',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT google_reviews_location_id_check
    CHECK (location_id IN ('south-plainfield', 'oak-tree', 'lawrenceville')),
  CONSTRAINT google_reviews_unique_review
    UNIQUE (location_id, google_review_id)
);

CREATE INDEX google_reviews_location_id_idx ON public.google_reviews (location_id);
CREATE INDEX google_reviews_review_time_idx ON public.google_reviews (review_time DESC);

CREATE TRIGGER google_reviews_set_updated_at
  BEFORE UPDATE ON public.google_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.google_reviews ENABLE ROW LEVEL SECURITY;

-- Public read only — writes happen exclusively via the scheduled sync
-- function using the service-role key, which bypasses RLS entirely.
CREATE POLICY "google_reviews_public_read"
  ON public.google_reviews FOR SELECT
  TO anon, authenticated
  USING (TRUE);
