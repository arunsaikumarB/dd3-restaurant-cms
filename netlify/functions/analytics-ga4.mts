import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { verifyAdminAccessToken } from "../../src/integrations/chefgaa/automation/handler";

/**
 * Admin-gated Google Analytics 4 Data API proxy.
 *
 * Reuses the ChefGaa Netlify Function pattern: verify the caller's Supabase
 * session (admin/staff) with verifyAdminAccessToken(), then talk to GA4 using
 * a service account whose credentials live ONLY in server env vars. Google
 * credentials are never exposed to the browser.
 *
 * Env vars (configured in Netlify → Environment variables):
 *   GA4_PROPERTY_ID   — numeric GA4 property id (no "properties/" prefix)
 *   GA4_CLIENT_EMAIL  — service-account email
 *   GA4_PRIVATE_KEY   — service-account private key (\n escaped)
 */

type HttpEvent = {
  httpMethod?: string;
  headers?: Record<string, string | undefined>;
  body?: string | null;
};

type Ga4RequestBody = {
  /** GA4 date string, e.g. "2026-07-01" or "7daysAgo". */
  startDate?: string;
  endDate?: string;
  /** Optional comparison range for period-over-period deltas. */
  compareStartDate?: string;
  compareEndDate?: string;
  /** Restrict to a location by pagePath prefix, e.g. "/oak-tree". Null = site-wide. */
  locationPrefix?: string | null;
};

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

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { expires: number; payload: Ga4AnalyticsResponse }>();

function num(value: string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pagePathFilter(prefix?: string | null) {
  if (!prefix) return undefined;
  return {
    filter: {
      fieldName: "pagePath",
      stringFilter: {
        matchType: "BEGINS_WITH" as const,
        value: prefix,
      },
    },
  };
}

function buildOverview(row: Record<string, number>): Ga4Overview {
  const activeUsers = row.activeUsers ?? 0;
  return {
    totalUsers: Math.round(row.totalUsers ?? 0),
    activeUsers: Math.round(activeUsers),
    sessions: Math.round(row.sessions ?? 0),
    screenPageViews: Math.round(row.screenPageViews ?? 0),
    newUsers: Math.round(row.newUsers ?? 0),
    avgEngagementSeconds:
      activeUsers > 0 ? Math.round((row.userEngagementDuration ?? 0) / activeUsers) : 0,
    bounceRatePct: Math.round((row.bounceRate ?? 0) * 100),
  };
}

export default async function handler(event: HttpEvent) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const authHeader = event.headers?.authorization ?? event.headers?.Authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const auth = await verifyAdminAccessToken(token);
  if (!auth.ok) {
    return { statusCode: 401, body: JSON.stringify({ error: auth.error }) };
  }

  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const privateKey = (process.env.GA4_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  if (!propertyId || !clientEmail || !privateKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error:
          "GA4 is not configured. Set GA4_PROPERTY_ID, GA4_CLIENT_EMAIL and GA4_PRIVATE_KEY.",
      }),
    };
  }

  let body: Ga4RequestBody = {};
  try {
    body = event.body ? (JSON.parse(event.body) as Ga4RequestBody) : {};
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const startDate = body.startDate || "7daysAgo";
  const endDate = body.endDate || "today";
  const prefix = body.locationPrefix ?? null;

  const cacheKey = JSON.stringify({
    startDate,
    endDate,
    compareStartDate: body.compareStartDate ?? null,
    compareEndDate: body.compareEndDate ?? null,
    prefix,
  });
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "X-Cache": "HIT" },
      body: JSON.stringify(cached.payload),
    };
  }

  const property = `properties/${propertyId}`;
  const dimensionFilter = pagePathFilter(prefix);

  try {
    const client = new BetaAnalyticsDataClient({
      credentials: { client_email: clientEmail, private_key: privateKey },
    });

    const overviewMetrics = [
      { name: "totalUsers" },
      { name: "activeUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "newUsers" },
      { name: "userEngagementDuration" },
      { name: "bounceRate" },
    ];

    const runOverview = (range: { startDate: string; endDate: string }) =>
      client.runReport({
        property,
        dateRanges: [range],
        metrics: overviewMetrics,
        dimensionFilter,
      });

    const hasCompare = Boolean(body.compareStartDate && body.compareEndDate);

    const [
      overviewRes,
      previousRes,
      timeseriesRes,
      trafficRes,
      pagesRes,
      devicesRes,
      countriesRes,
      realtimeRes,
    ] = await Promise.all([
      runOverview({ startDate, endDate }),
      hasCompare
        ? runOverview({
            startDate: body.compareStartDate as string,
            endDate: body.compareEndDate as string,
          })
        : Promise.resolve(null),
      client.runReport({
        property,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "screenPageViews" }, { name: "sessions" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
        dimensionFilter,
      }),
      client.runReport({
        property,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
        dimensionFilter,
      }),
      client.runReport({
        property,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 10,
        dimensionFilter,
      }),
      client.runReport({
        property,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "activeUsers" }],
        dimensionFilter,
      }),
      client.runReport({
        property,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 10,
        dimensionFilter,
      }),
      // Realtime is site-wide (pagePath is not a realtime dimension).
      client.runRealtimeReport({
        property,
        metrics: [{ name: "activeUsers" }],
      }),
    ]);

    const readOverviewRow = (
      res: Awaited<ReturnType<typeof runOverview>> | null,
    ): Ga4Overview => {
      const report = res?.[0];
      const row = report?.rows?.[0];
      const values = row?.metricValues ?? [];
      const named: Record<string, number> = {};
      (report?.metricHeaders ?? []).forEach((h, i) => {
        if (h.name) named[h.name] = num(values[i]?.value);
      });
      return buildOverview(named);
    };

    const overview = readOverviewRow(overviewRes);
    const overviewPrevious = previousRes ? readOverviewRow(previousRes) : null;

    const timeseries: Ga4TimeseriesPoint[] = (timeseriesRes[0]?.rows ?? []).map((row) => ({
      date: row.dimensionValues?.[0]?.value ?? "",
      views: num(row.metricValues?.[0]?.value),
      sessions: num(row.metricValues?.[1]?.value),
    }));

    // Group channels into Organic / Direct / Social / Referral (+ Other).
    const trafficBuckets: Record<string, number> = {
      Organic: 0,
      Direct: 0,
      Social: 0,
      Referral: 0,
      Other: 0,
    };
    for (const row of trafficRes[0]?.rows ?? []) {
      const channel = (row.dimensionValues?.[0]?.value ?? "").toLowerCase();
      const sessions = num(row.metricValues?.[0]?.value);
      if (channel.includes("social")) trafficBuckets.Social += sessions;
      else if (channel.includes("organic")) trafficBuckets.Organic += sessions;
      else if (channel.includes("direct")) trafficBuckets.Direct += sessions;
      else if (channel.includes("referral")) trafficBuckets.Referral += sessions;
      else trafficBuckets.Other += sessions;
    }
    const trafficSources: Ga4NamedMetric[] = ["Organic", "Direct", "Social", "Referral", "Other"]
      .map((label) => ({ label, value: trafficBuckets[label] }))
      .filter((entry) => entry.value > 0);

    const topPages: Ga4NamedMetric[] = (pagesRes[0]?.rows ?? []).map((row) => ({
      label: row.dimensionValues?.[0]?.value ?? "(unknown)",
      value: num(row.metricValues?.[0]?.value),
    }));

    const devices: Ga4NamedMetric[] = (devicesRes[0]?.rows ?? []).map((row) => ({
      label: row.dimensionValues?.[0]?.value ?? "(unknown)",
      value: num(row.metricValues?.[0]?.value),
    }));

    const countries: Ga4NamedMetric[] = (countriesRes[0]?.rows ?? []).map((row) => ({
      label: row.dimensionValues?.[0]?.value ?? "(unknown)",
      value: num(row.metricValues?.[0]?.value),
    }));

    const realtimeActiveUsers = num(realtimeRes[0]?.rows?.[0]?.metricValues?.[0]?.value);

    const payload: Ga4AnalyticsResponse = {
      overview,
      overviewPrevious,
      timeseries,
      trafficSources,
      topPages,
      devices,
      countries,
      realtimeActiveUsers,
      generatedAt: new Date().toISOString(),
    };

    cache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, payload });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "X-Cache": "MISS" },
      body: JSON.stringify(payload),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "GA4 request failed.";
    return {
      statusCode: 502,
      body: JSON.stringify({ error: `Google Analytics request failed: ${message}` }),
    };
  }
}
