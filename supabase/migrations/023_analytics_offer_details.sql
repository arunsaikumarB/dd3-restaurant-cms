-- Per-offer analytics: join active offers with event stats + daily breakdown
-- Drop first so environments with the 022 return shape can recreate cleanly.

DROP FUNCTION IF EXISTS public.analytics_offer_performance(TEXT, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.analytics_offer_daily(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.analytics_offer_performance(
  p_location TEXT,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
) RETURNS TABLE (
  offer_id UUID,
  offer_title TEXT,
  is_active BOOLEAN,
  views BIGINT,
  clicks BIGINT
) LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT
    o.id,
    o.title,
    o.active,
    COALESCE(
      count(e.id) FILTER (WHERE e.event_type = 'offer_view'),
      0
    )::BIGINT,
    COALESCE(
      count(e.id) FILTER (WHERE e.event_type = 'offer_click'),
      0
    )::BIGINT
  FROM public.offers o
  LEFT JOIN public.analytics_events e
    ON e.offer_id = o.id
    AND e.location_id = p_location
    AND e.created_at >= p_from
    AND e.created_at <= p_to
  WHERE o.location_id = p_location
    AND o.active = true
  GROUP BY o.id, o.title, o.active
  ORDER BY 5 DESC, 4 DESC, o.title;
$$;

CREATE OR REPLACE FUNCTION public.analytics_offer_daily(
  p_offer UUID,
  p_location TEXT,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
) RETURNS TABLE (
  day DATE,
  views BIGINT,
  clicks BIGINT
) LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT
    created_at::date,
    count(*) FILTER (WHERE event_type = 'offer_view'),
    count(*) FILTER (WHERE event_type = 'offer_click')
  FROM public.analytics_events
  WHERE offer_id = p_offer
    AND location_id = p_location
    AND created_at >= p_from
    AND created_at <= p_to
  GROUP BY 1
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.analytics_offer_performance(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_offer_daily(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
