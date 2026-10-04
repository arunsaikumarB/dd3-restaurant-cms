-- Shared per-IP counters for public Netlify functions.
-- Service role only. Until this is applied, functions fall back to a
-- per-instance memory limit and keep serving traffic.

CREATE TABLE IF NOT EXISTS public.function_rate_limits (
  bucket text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  hit_count integer NOT NULL DEFAULT 1
);

ALTER TABLE public.function_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_function_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_bucket IS NULL OR length(p_bucket) = 0 OR length(p_bucket) > 200 THEN
    RETURN false;
  END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    RETURN false;
  END IF;

  INSERT INTO public.function_rate_limits (bucket, window_start, hit_count)
  VALUES (p_bucket, now(), 1)
  ON CONFLICT (bucket) DO UPDATE
    SET
      hit_count = CASE
        WHEN public.function_rate_limits.window_start <= now() - make_interval(secs => p_window_seconds)
          THEN 1
        ELSE public.function_rate_limits.hit_count + 1
      END,
      window_start = CASE
        WHEN public.function_rate_limits.window_start <= now() - make_interval(secs => p_window_seconds)
          THEN now()
        ELSE public.function_rate_limits.window_start
      END
  RETURNING hit_count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_function_rate_limit(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_function_rate_limit(text, integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.consume_function_rate_limit(text, integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_function_rate_limit(text, integer, integer) TO service_role;
