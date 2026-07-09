-- =============================================================================
-- Seed page_content for the newly CMS-editable Order page hero and
-- "Why Order Direct" feature grid (previously hardcoded, no admin control).
-- Identical starting content for all locations, matching prior hardcoded copy.
-- =============================================================================

WITH locations AS (
  SELECT unnest(ARRAY['south-plainfield', 'oak-tree', 'lawrenceville']::text[]) AS location_id
),
seed_sections AS (
  SELECT * FROM (VALUES
    ('order', 'hero', '{"label": "Order Online", "title": "Order Online", "subtitleTemplate": "Order authentic Indian food from Desi Dhamaka {location}. Choose pickup or delivery — freshly prepared, delivered your way."}'::jsonb),
    ('order', 'features', '{"eyebrow": "Why Order Direct", "title": "The Desi Dhamaka Difference", "items": [{"icon": "fresh", "title": "Fresh Preparation", "description": "Every order prepared to order in our kitchen."}, {"icon": "pricing", "title": "Better Pricing", "description": "Save more when you order direct from us."}, {"icon": "pickup", "title": "Quick Pickup", "description": "Ready fast for convenient collection."}, {"icon": "offers", "title": "Exclusive Offers", "description": "Special deals for direct orders only."}]}'::jsonb)
  ) AS t(page, section, content)
)
INSERT INTO public.page_content (location_id, page, section, content)
SELECT l.location_id, s.page, s.section, s.content
FROM locations l
CROSS JOIN seed_sections s
ON CONFLICT (location_id, page, section) DO NOTHING;
