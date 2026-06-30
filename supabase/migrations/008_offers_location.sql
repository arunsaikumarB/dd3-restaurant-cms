-- Multi-location offers: each promotion belongs to one restaurant location.

ALTER TABLE public.offers
  ADD COLUMN location_id TEXT NOT NULL DEFAULT 'lawrenceville';

ALTER TABLE public.offers
  ADD CONSTRAINT offers_location_id_check
  CHECK (location_id IN ('south-plainfield', 'oak-tree', 'lawrenceville'));

CREATE INDEX offers_location_id_idx ON public.offers (location_id);
CREATE INDEX offers_location_active_idx ON public.offers (location_id, active);
CREATE INDEX offers_location_dates_idx ON public.offers (location_id, start_date, end_date);
