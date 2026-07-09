-- =============================================================================
-- Backfill icon field onto existing parties.events items (added to the CMS
-- schema so event icons are admin-editable instead of hardcoded and
-- positionally matched to the original 6 event types).
-- =============================================================================

UPDATE public.page_content
SET content = jsonb_set(
  content,
  '{items}',
  '[
    {"icon": "◈", "title": "Private Dining", "text": "An intimate room for exclusive gatherings — personalised menus, dedicated service and complete privacy."},
    {"icon": "✦", "title": "Birthday Celebrations", "text": "Make their day extraordinary with custom décor, curated menus and a celebration they''ll never forget."},
    {"icon": "◆", "title": "Graduation", "text": "Mark the milestone with a feast worthy of the achievement — family-style or plated service available."},
    {"icon": "♦", "title": "Anniversary", "text": "Romantic settings, candlelit ambience and dishes crafted for two or twenty."},
    {"icon": "◉", "title": "Corporate Gatherings", "text": "Team dinners, product launches and executive meetings in a refined, private setting."},
    {"icon": "❋", "title": "Cultural Events", "text": "Celebrate milestones and traditions with authentic cuisine and curated hospitality."}
  ]'::jsonb
)
WHERE page = 'parties'
  AND section = 'events'
  AND content->'items' IS NOT NULL;
