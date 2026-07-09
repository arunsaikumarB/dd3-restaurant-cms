-- =============================================================================
-- Seed page_content for the newly CMS-editable Privacy Policy and
-- Terms & Conditions pages (previously hardcoded in the React components).
-- Identical starting content for all locations, matching prior hardcoded copy.
-- =============================================================================

WITH locations AS (
  SELECT unnest(ARRAY['south-plainfield', 'oak-tree', 'lawrenceville']::text[]) AS location_id
),
seed_sections AS (
  SELECT * FROM (VALUES
    ('privacy_policy', 'hero', '{"label": "Legal", "title": "Privacy Policy", "subtitleTemplate": "How {name} {location} collects, uses and protects your information."}'::jsonb),
    ('privacy_policy', 'content', '{"introTemplate": "Last updated: {year}. This Privacy Policy explains how {name} ({address}) collects, uses and safeguards information when you visit our website, place an order, make a reservation or otherwise interact with us.", "sections": [{"title": "Information We Collect", "textTemplate": "We may collect information you provide directly, such as your name, email address, phone number and reservation or order details, as well as information collected automatically through cookies and similar technologies when you browse our site."}, {"title": "How We Use Information", "textTemplate": "We use the information we collect to process reservations and orders, respond to enquiries, improve our website and services, and — where you have consented — to send promotional communications about offers and events at our locations."}, {"title": "Third-Party Services", "textTemplate": "Reservations, online ordering and delivery may be handled by trusted third-party platforms (such as OpenTable, ChefGaa and Uber Eats). Those providers have their own privacy policies governing the information you share with them directly."}, {"title": "Contact Us", "textTemplate": "If you have questions about this Privacy Policy or how your information is handled, please contact us at {email} or call {phone}."}]}'::jsonb),
    ('terms_conditions', 'hero', '{"label": "Legal", "title": "Terms & Conditions", "subtitleTemplate": "The terms governing your use of {name} {location}''s website and services."}'::jsonb),
    ('terms_conditions', 'content', '{"introTemplate": "Last updated: {year}. These Terms & Conditions govern your use of the {name} website and any reservations, orders, offers or events booked through it.", "sections": [{"title": "Reservations & Orders", "textTemplate": "Reservations and online orders are subject to availability and confirmation. Prices, menu items and offers may vary by location and are subject to change without notice. Special offers have their own terms, detailed on the relevant offer page."}, {"title": "Cancellations", "textTemplate": "Please contact the location directly to modify or cancel a reservation. Large party and private event bookings may be subject to a separate cancellation policy communicated at the time of booking."}, {"title": "Website Use", "textTemplate": "Content on this website is provided for general informational purposes. We make reasonable efforts to keep menu, pricing and location information accurate but do not guarantee it is free of errors or omissions."}, {"title": "Contact Us", "textTemplate": "Questions about these Terms & Conditions can be directed to {email} or {phone}."}]}'::jsonb)
  ) AS t(page, section, content)
)
INSERT INTO public.page_content (location_id, page, section, content)
SELECT l.location_id, s.page, s.section, s.content
FROM locations l
CROSS JOIN seed_sections s
ON CONFLICT (location_id, page, section) DO NOTHING;
