-- Multi-location offers: each promotion belongs to one restaurant location.
-- Idempotent: safe to re-run after a partial/previous apply.

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS location_id TEXT NOT NULL DEFAULT 'lawrenceville';

ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_location_id_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_location_id_check
  CHECK (location_id IN ('south-plainfield', 'oak-tree', 'lawrenceville'));

CREATE INDEX IF NOT EXISTS offers_location_id_idx ON public.offers (location_id);
CREATE INDEX IF NOT EXISTS offers_location_active_idx ON public.offers (location_id, active);
CREATE INDEX IF NOT EXISTS offers_location_dates_idx
  ON public.offers (location_id, start_date, end_date);
