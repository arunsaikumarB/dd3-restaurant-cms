-- Support multiple phone numbers per outlet (2–5 typical).
ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS phones JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill from legacy single phone column.
UPDATE public.restaurant_settings
SET phones = jsonb_build_array(phone)
WHERE phone IS NOT NULL
  AND trim(phone) <> ''
  AND (phones IS NULL OR phones = '[]'::jsonb);

COMMENT ON COLUMN public.restaurant_settings.phones IS
  'Ordered list of outlet phone numbers (JSON array of strings). Legacy phone column stores the primary (first) number.';
