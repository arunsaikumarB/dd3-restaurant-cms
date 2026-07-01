import { createClientIfConfigured } from "../lib/supabase/client";
import { isSupabaseConfigured } from "../lib/supabase/env";
import type { LocationId } from "../config/locations";

type AnalyticsRpcClient = {
  rpc: (
    fn: string,
    args: Record<string, string>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export type AnalyticsSummary = {
  total_page_views: number;
  unique_sessions: number;
  offers_page_views: number;
  offer_clicks: number;
  order_clicks: number;
  reservation_clicks: number;
};

export type AnalyticsDayRow = {
  day: string;
  views: number;
  sessions: number;
};

export type AnalyticsPageRow = {
  page_path: string;
  views: number;
};

export type AnalyticsOfferRow = {
  offer_id: string;
  offer_title: string;
  is_active: boolean;
  views: number;
  clicks: number;
};

export type AnalyticsOfferDayRow = {
  day: string;
  views: number;
  clicks: number;
};

export type AnalyticsDeviceRow = {
  device: string;
  views: number;
};

export type AnalyticsReferrerRow = {
  referrer: string;
  views: number;
};

const EMPTY_SUMMARY: AnalyticsSummary = {
  total_page_views: 0,
  unique_sessions: 0,
  offers_page_views: 0,
  offer_clicks: 0,
  order_clicks: 0,
  reservation_clicks: 0,
};

function row<T>(data: T[] | null): T | null {
  if (!data || data.length === 0) return null;
  return data[0] ?? null;
}

export async function fetchAnalyticsSummary(
  locationId: LocationId,
  from: Date,
  to: Date,
): Promise<AnalyticsSummary> {
  if (!isSupabaseConfigured()) return EMPTY_SUMMARY;
  const supabase = createClientIfConfigured();
  if (!supabase) return EMPTY_SUMMARY;

  const rpc = supabase as unknown as AnalyticsRpcClient;

  const { data, error } = await rpc.rpc("analytics_summary", {
    p_location: locationId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });

  if (error || !data) return EMPTY_SUMMARY;
  const result = row(data as AnalyticsSummary[]);
  if (!result) return EMPTY_SUMMARY;

  return {
    total_page_views: Number(result.total_page_views ?? 0),
    unique_sessions: Number(result.unique_sessions ?? 0),
    offers_page_views: Number(result.offers_page_views ?? 0),
    offer_clicks: Number(result.offer_clicks ?? 0),
    order_clicks: Number(result.order_clicks ?? 0),
    reservation_clicks: Number(result.reservation_clicks ?? 0),
  };
}

export async function fetchAnalyticsViewsByDay(
  locationId: LocationId,
  from: Date,
  to: Date,
): Promise<AnalyticsDayRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClientIfConfigured();
  if (!supabase) return [];

  const rpc = supabase as unknown as AnalyticsRpcClient;
  const { data, error } = await rpc.rpc("analytics_views_by_day", {
    p_location: locationId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });

  if (error || !data) return [];
  return (data as AnalyticsDayRow[]).map((row) => ({
    day: row.day,
    views: Number(row.views ?? 0),
    sessions: Number(row.sessions ?? 0),
  }));
}

export async function fetchAnalyticsViewsByPage(
  locationId: LocationId,
  from: Date,
  to: Date,
): Promise<AnalyticsPageRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClientIfConfigured();
  if (!supabase) return [];

  const rpc = supabase as unknown as AnalyticsRpcClient;
  const { data, error } = await rpc.rpc("analytics_views_by_page", {
    p_location: locationId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });

  if (error || !data) return [];
  return (data as AnalyticsPageRow[]).map((row) => ({
    page_path: row.page_path,
    views: Number(row.views ?? 0),
  }));
}

export async function fetchAnalyticsOfferPerformance(
  locationId: LocationId,
  from: Date,
  to: Date,
): Promise<AnalyticsOfferRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClientIfConfigured();
  if (!supabase) return [];

  const rpc = supabase as unknown as AnalyticsRpcClient;
  const { data, error } = await rpc.rpc("analytics_offer_performance", {
    p_location: locationId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });

  if (error || !data) return [];
  return (data as AnalyticsOfferRow[]).map((row) => ({
    offer_id: row.offer_id,
    offer_title: row.offer_title ?? "Untitled offer",
    is_active: Boolean(row.is_active ?? true),
    views: Number(row.views ?? 0),
    clicks: Number(row.clicks ?? 0),
  }));
}

export function pickTopOffer(offers: AnalyticsOfferRow[]): AnalyticsOfferRow | null {
  if (offers.length === 0) return null;
  const sorted = [...offers].sort((a, b) => b.clicks - a.clicks || b.views - a.views);
  const top = sorted[0];
  if (top.clicks === 0 && top.views === 0) return null;
  return top;
}

export async function fetchAnalyticsOfferDaily(
  offerId: string,
  locationId: LocationId,
  from: Date,
  to: Date,
): Promise<AnalyticsOfferDayRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClientIfConfigured();
  if (!supabase) return [];

  const rpc = supabase as unknown as AnalyticsRpcClient;
  const { data, error } = await rpc.rpc("analytics_offer_daily", {
    p_offer: offerId,
    p_location: locationId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });

  if (error || !data) return [];
  return (data as AnalyticsOfferDayRow[]).map((row) => ({
    day: row.day,
    views: Number(row.views ?? 0),
    clicks: Number(row.clicks ?? 0),
  }));
}

export async function fetchAnalyticsDevices(
  locationId: LocationId,
  from: Date,
  to: Date,
): Promise<AnalyticsDeviceRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClientIfConfigured();
  if (!supabase) return [];

  const rpc = supabase as unknown as AnalyticsRpcClient;
  const { data, error } = await rpc.rpc("analytics_devices", {
    p_location: locationId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });

  if (error || !data) return [];
  return (data as AnalyticsDeviceRow[]).map((row) => ({
    device: row.device,
    views: Number(row.views ?? 0),
  }));
}

export async function fetchAnalyticsReferrers(
  locationId: LocationId,
  from: Date,
  to: Date,
): Promise<AnalyticsReferrerRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClientIfConfigured();
  if (!supabase) return [];

  const rpc = supabase as unknown as AnalyticsRpcClient;
  const { data, error } = await rpc.rpc("analytics_referrers", {
    p_location: locationId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });

  if (error || !data) return [];
  return (data as AnalyticsReferrerRow[]).map((row) => ({
    referrer: row.referrer,
    views: Number(row.views ?? 0),
  }));
}

export function getPreviousPeriod(from: Date, to: Date): { from: Date; to: Date } {
  const durationMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - durationMs);
  return { from: prevFrom, to: prevTo };
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}
