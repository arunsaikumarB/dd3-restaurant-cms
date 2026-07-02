-- 027_url_restructure_analytics.sql
-- URL restructure: /offers -> /special-offers, /order -> /online-ordering,
-- location-prefixed paths. Normalize historical analytics rows, update the
-- offers filter in analytics_summary, and point CMS-stored URLs at the new
-- segments (footer legal links + pre-footer order CTA).

-- 1) Normalize historical analytics_events.page_path
--    a. strip location prefixes (location_id is already its own column)
UPDATE public.analytics_events
SET page_path = regexp_replace(
  page_path,
  '^/(south-plainfield|oak-tree|lawrenceville)(?=/|$)',
  ''
)
WHERE page_path ~ '^/(south-plainfield|oak-tree|lawrenceville)(/|$)';

--    b. empty after stripping = location home
UPDATE public.analytics_events SET page_path = '/' WHERE page_path = '';

--    c. strip trailing slashes (keep root "/")
UPDATE public.analytics_events
SET page_path = rtrim(page_path, '/')
WHERE page_path <> '/' AND page_path LIKE '%/';

--    d. legacy segment names -> canonical
UPDATE public.analytics_events SET page_path = '/special-offers'
WHERE page_path = '/offers';
UPDATE public.analytics_events
SET page_path = replace(page_path, '/offers/', '/special-offers/')
WHERE page_path LIKE '/offers/%';
UPDATE public.analytics_events SET page_path = '/online-ordering'
WHERE page_path = '/order';

-- 2) analytics_summary: count offers page views on the new path
--    (keep legacy '/offers' in the filter defensively).
CREATE OR REPLACE FUNCTION public.analytics_summary(
  p_location TEXT, p_from TIMESTAMPTZ, p_to TIMESTAMPTZ
) RETURNS TABLE (
  total_page_views BIGINT,
  unique_sessions BIGINT,
  offers_page_views BIGINT,
  offer_clicks BIGINT,
  order_clicks BIGINT,
  reservation_clicks BIGINT
) LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT
    count(*) FILTER (WHERE event_type='page_view'),
    count(DISTINCT session_id),
    count(*) FILTER (WHERE event_type='page_view'
      AND page_path IN ('/offers','/special-offers')),
    count(*) FILTER (WHERE event_type='offer_click'),
    count(*) FILTER (WHERE event_type='order_click'),
    count(*) FILTER (WHERE event_type='reservation_click')
  FROM public.analytics_events
  WHERE location_id = p_location
    AND created_at BETWEEN p_from AND p_to;
$$;

GRANT EXECUTE ON FUNCTION
  public.analytics_summary(TEXT, TIMESTAMPTZ, TIMESTAMPTZ)
TO authenticated;

-- 3) CMS-stored URLs -> new segments (relative urls resolve through
--    locPath() at render time, so values stay location-agnostic).
UPDATE public.page_content
SET content = jsonb_set(content, '{privacyCta,url}', '"/privacy-policy"')
WHERE page = 'global' AND section = 'footer_legal';

UPDATE public.page_content
SET content = jsonb_set(content, '{termsCta,url}', '"/terms-conditions"')
WHERE page = 'global' AND section = 'footer_legal';

UPDATE public.page_content
SET content = jsonb_set(content, '{orderCta,url}', '"/online-ordering"')
WHERE page = 'global' AND section = 'footer_pre_cta'
  AND content -> 'orderCta' ->> 'url' = '/order';
