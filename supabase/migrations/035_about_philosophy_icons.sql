-- =============================================================================
-- Backfill icon field onto existing about.philosophy pillars (added to the
-- CMS schema so pillar icons are admin-editable instead of hardcoded and
-- positionally matched to the original 3 pillars).
-- =============================================================================

UPDATE public.page_content
SET content = jsonb_set(
  content,
  '{pillars}',
  '[
    {"icon": "🌿", "title": "Authenticity", "text": "Whole spices, hand-ground masalas and recipes passed through generations."},
    {"icon": "✦", "title": "Quality", "text": "Premium ingredients sourced with care, prepared fresh for every service."},
    {"icon": "◆", "title": "Hospitality", "text": "Every guest is family. Every table, an experience worth remembering."}
  ]'::jsonb
)
WHERE page = 'about'
  AND section = 'philosophy'
  AND content->'pillars' IS NOT NULL;
