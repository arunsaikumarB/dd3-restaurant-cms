-- =============================================================================
-- Migrate restaurant_settings.opening_hours from the fixed {weekday, weekend,
-- sunday} object shape into a flexible, admin-orderable array of
-- {id, days, time} rows — so admins can define any number of day-groups
-- (e.g. "Monday", "Mon – Fri", "Everyday") instead of exactly 3 fixed slots.
-- =============================================================================

UPDATE public.restaurant_settings
SET opening_hours = jsonb_build_array(
  jsonb_build_object('id', 'weekday', 'days', 'Mon – Thu', 'time', COALESCE(opening_hours->>'weekday', '')),
  jsonb_build_object('id', 'weekend', 'days', 'Fri – Sat', 'time', COALESCE(opening_hours->>'weekend', '')),
  jsonb_build_object('id', 'sunday', 'days', 'Sun', 'time', COALESCE(opening_hours->>'sunday', ''))
)
WHERE opening_hours IS NOT NULL
  AND jsonb_typeof(opening_hours) = 'object';
