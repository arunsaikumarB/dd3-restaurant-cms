-- Location-scoped website analytics (page views, offers, CTAs)

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  location_id TEXT NOT NULL CHECK (location_id IN (
    'south-plainfield', 'oak-tree', 'lawrenceville'
  )),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'page_view', 'offer_view', 'offer_click',
    'order_click', 'reservation_click'
  )),
  page_path TEXT NOT NULL,
  offer_id UUID,
  offer_title TEXT,
  session_id TEXT NOT NULL,
  referrer TEXT,
  device TEXT CHECK (device IN ('mobile', 'tablet', 'desktop')),
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_analytics_loc_date
  ON public.analytics_events (location_id, created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_type
  ON public.analytics_events (event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_page
  ON public.analytics_events (page_path, created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_offer
  ON public.analytics_events (offer_id)
  WHERE offer_id IS NOT NULL;

ALTER TABLE public.analytics_events
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can insert events"
  ON public.analytics_events FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "authenticated can read events"
  ON public.analytics_events FOR SELECT
  TO authenticated
  USING (true);

-- Aggregation RPCs (admin reads aggregates, not raw rows)

CREATE OR REPLACE FUNCTION public.analytics_summary(
  p_location TEXT,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
) RETURNS TABLE (
  total_page_views BIGINT,
  unique_sessions BIGINT,
  offers_page_views BIGINT,
  offer_clicks BIGINT,
  order_clicks BIGINT,
  reservation_clicks BIGINT
) LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT
    count(*) FILTER (WHERE event_type = 'page_view'),
    count(DISTINCT session_id),
    count(*) FILTER (WHERE event_type = 'page_view' AND page_path = '/offers'),
    count(*) FILTER (WHERE event_type = 'offer_click'),
    count(*) FILTER (WHERE event_type = 'order_click'),
    count(*) FILTER (WHERE event_type = 'reservation_click')
  FROM public.analytics_events
  WHERE location_id = p_location
    AND created_at >= p_from
    AND created_at <= p_to;
$$;

CREATE OR REPLACE FUNCTION public.analytics_views_by_day(
  p_location TEXT,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
) RETURNS TABLE (day DATE, views BIGINT, sessions BIGINT)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT
    created_at::date,
    count(*) FILTER (WHERE event_type = 'page_view'),
    count(DISTINCT session_id)
  FROM public.analytics_events
  WHERE location_id = p_location
    AND created_at >= p_from
    AND created_at <= p_to
  GROUP BY 1
  ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION public.analytics_views_by_page(
  p_location TEXT,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
) RETURNS TABLE (page_path TEXT, views BIGINT)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT page_path, count(*)
  FROM public.analytics_events
  WHERE location_id = p_location
    AND event_type = 'page_view'
    AND created_at >= p_from
    AND created_at <= p_to
  GROUP BY 1
  ORDER BY 2 DESC;
$$;

CREATE OR REPLACE FUNCTION public.analytics_offer_performance(
  p_location TEXT,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
) RETURNS TABLE (
  offer_id UUID,
  offer_title TEXT,
  views BIGINT,
  clicks BIGINT
) LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT
    offer_id,
    max(offer_title),
    count(*) FILTER (WHERE event_type = 'offer_view'),
    count(*) FILTER (WHERE event_type = 'offer_click')
  FROM public.analytics_events
  WHERE location_id = p_location
    AND offer_id IS NOT NULL
    AND created_at >= p_from
    AND created_at <= p_to
  GROUP BY offer_id
  ORDER BY 3 DESC;
$$;

CREATE OR REPLACE FUNCTION public.analytics_devices(
  p_location TEXT,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
) RETURNS TABLE (device TEXT, views BIGINT)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT coalesce(device, 'desktop'), count(*)
  FROM public.analytics_events
  WHERE location_id = p_location
    AND event_type = 'page_view'
    AND created_at >= p_from
    AND created_at <= p_to
  GROUP BY 1;
$$;

CREATE OR REPLACE FUNCTION public.analytics_referrers(
  p_location TEXT,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
) RETURNS TABLE (referrer TEXT, views BIGINT)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT coalesce(nullif(referrer, ''), 'Direct'), count(*)
  FROM public.analytics_events
  WHERE location_id = p_location
    AND event_type = 'page_view'
    AND created_at >= p_from
    AND created_at <= p_to
  GROUP BY 1
  ORDER BY 2 DESC
  LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION public.analytics_summary(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_views_by_day(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_views_by_page(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_offer_performance(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_devices(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_referrers(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMENT ON TABLE public.analytics_events IS 'Anonymous website analytics events (location-scoped, immutable log)';
