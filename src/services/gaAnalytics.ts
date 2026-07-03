import { createClientIfConfigured } from "../lib/supabase/client";

/**
 * Client for the admin-gated GA4 Netlify Function.
 *
 * Mirrors the ChefGaa integration pattern: grab the Supabase session access
 * token and send it as a Bearer credential to the serverless function, which
 * verifies admin access and talks to Google Analytics 4. Google credentials
 * never touch the browser.
 */

const GA4_FUNCTION_PATH = "/.netlify/functions/analytics-ga4";

export interface Ga4Overview {
  totalUsers: number;
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
  newUsers: number;
  avgEngagementSeconds: number;
  bounceRatePct: number;
}

export interface Ga4TimeseriesPoint {
  date: string;
  views: number;
  sessions: number;
}

export interface Ga4NamedMetric {
  label: string;
  value: number;
}

export interface Ga4AnalyticsResponse {
  overview: Ga4Overview;
  overviewPrevious: Ga4Overview | null;
  timeseries: Ga4TimeseriesPoint[];
  trafficSources: Ga4NamedMetric[];
  topPages: Ga4NamedMetric[];
  devices: Ga4NamedMetric[];
  countries: Ga4NamedMetric[];
  realtimeActiveUsers: number;
  generatedAt: string;
}

export interface Ga4Request {
  /** GA4 date string "YYYY-MM-DD". */
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
  /** Location pagePath prefix, e.g. "/oak-tree". Null/omitted = site-wide. */
  locationPrefix?: string | null;
}

export class Ga4Error extends Error {}

/** Format a Date as a GA4-compatible local date string ("YYYY-MM-DD"). */
export function toGaDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Small client-side cache (5 min) keyed by request params — complements the
// server-side cache and avoids refetching on quick tab/date toggles.
const CLIENT_TTL_MS = 5 * 60 * 1000;
const clientCache = new Map<string, { expires: number; data: Ga4AnalyticsResponse }>();

export async function fetchGaAnalytics(
  request: Ga4Request,
): Promise<Ga4AnalyticsResponse> {
  const cacheKey = JSON.stringify(request);
  const cached = clientCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const supabase = createClientIfConfigured();
  if (!supabase) {
    throw new Ga4Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Ga4Error("Sign in to the admin dashboard to view analytics.");
  }

  let response: Response;
  try {
    response = await fetch(GA4_FUNCTION_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(request),
    });
  } catch (error) {
    throw new Ga4Error(
      error instanceof Error
        ? `Analytics service unavailable: ${error.message}`
        : "Analytics service unavailable.",
    );
  }

  if (!response.ok) {
    let message = `Analytics request failed (${response.status}).`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      /* keep default message */
    }
    throw new Ga4Error(message);
  }

  const data = (await response.json()) as Ga4AnalyticsResponse;
  clientCache.set(cacheKey, { expires: Date.now() + CLIENT_TTL_MS, data });
  return data;
}

/** Clear the client cache (e.g. when the user hits Refresh). */
export function invalidateGaAnalyticsCache(): void {
  clientCache.clear();
}
