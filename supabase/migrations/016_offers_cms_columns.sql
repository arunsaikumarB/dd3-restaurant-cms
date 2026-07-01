-- Expand offers table for full CMS (content sections, gallery, slug, display order).
-- Keeps legacy banner/discount/start_date/end_date for backward compatibility.
--
-- Field semantics:
--   valid_until  TEXT  — public marketing label (e.g. "Every Tuesday", "Mon–Fri, 12:00 PM – 3:00 PM")
--   start_date   DATE  — optional admin promo window start (schedule filtering)
--   end_date     DATE  — optional admin promo window end (schedule filtering)
-- Do NOT store marketing copy in DATE columns or coerce it via ::date casts.

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS badge TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS price TEXT,
  ADD COLUMN IF NOT EXISTS valid_until TEXT,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS terms JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS content JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS order_category TEXT;

-- If a partial run created valid_until as DATE, convert existing calendar values to TEXT.
-- Marketing strings must never be forced through ::date.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'offers'
      AND column_name = 'valid_until'
      AND data_type = 'date'
  ) THEN
    ALTER TABLE public.offers
      ALTER COLUMN valid_until TYPE TEXT
      USING CASE
        WHEN valid_until IS NULL THEN NULL
        ELSE to_char(valid_until, 'YYYY-MM-DD')
      END;
  END IF;
END $$;

-- Backfill CMS columns from legacy fields (never copy end_date into valid_until).
UPDATE public.offers
SET
  image = COALESCE(image, banner),
  badge = COALESCE(badge, discount),
  slug = COALESCE(
    NULLIF(trim(slug), ''),
    lower(regexp_replace(regexp_replace(trim(title), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
      || '-' || left(replace(id::text, '-', ''), 8)
  )
WHERE image IS NULL
   OR badge IS NULL
   OR slug IS NULL
   OR trim(slug) = '';

CREATE UNIQUE INDEX IF NOT EXISTS offers_location_slug_unique_idx
  ON public.offers (location_id, slug)
  WHERE slug IS NOT NULL AND trim(slug) <> '';

CREATE INDEX IF NOT EXISTS offers_location_display_order_idx
  ON public.offers (location_id, display_order);
