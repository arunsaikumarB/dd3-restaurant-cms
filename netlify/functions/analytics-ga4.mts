import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { GoogleAuth } from "google-auth-library";
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

/**
 * Normalizes a PEM private key from Netlify environment-variable storage.
 *
 * Accepts BOTH supported input shapes and produces a canonical PEM:
 *   1. Escaped one-liner:
 *      "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
 *   2. Real multiline PEM:
 *      -----BEGIN PRIVATE KEY-----
 *      MIIE...
 *      -----END PRIVATE KEY-----
 *
 * Also tolerates surrounding quotes, CRLF line endings, double-escaped \\n,
 * and headers/footers glued onto the base64 body on a single line.
 */
function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if (!key) return "";

  // Strip a single layer of wrapping quotes (Netlify UI sometimes keeps them).
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  // Case 1: escaped newlines → real newlines (handle double-escaped first).
  key = key.replace(/\\\\n/g, "\\n").replace(/\\n/g, "\n");

  // Normalize CRLF / lone CR to LF so multiline PEM (case 2) is consistent.
  key = key.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // If header/footer are on the same line as the body (no separating newline),
  // insert newlines around them so the canonical reflow below can run.
  key = key
    .replace(/-----BEGIN ([A-Z0-9 ]+?)-----\s*/g, "-----BEGIN $1-----\n")
    .replace(/\s*-----END ([A-Z0-9 ]+?)-----/g, "\n-----END $1-----");

  // Canonicalize: strip all inner whitespace from the base64 body and re-wrap
  // at 64 chars — this repairs both single-line and irregularly-wrapped keys.
  const pemMatch = key.match(/-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/);
  if (pemMatch) {
    const [, label, body] = pemMatch;
    const compact = body.replace(/\s+/g, "");
    const lines = compact.match(/.{1,64}/g) ?? [compact];
    key = `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
  }

  if (!key.endsWith("\n")) key += "\n";
  return key;
}

/**
 * Validates a normalized PEM key. Returns a descriptive error string when
 * invalid, or null when the key looks structurally sound.
 */
function validatePrivateKey(key: string): string | null {
  if (!key.trim()) {
    return "GA4_PRIVATE_KEY is empty. Set it in Netlify → Environment variables.";
  }

  const beginMatch = key.match(/-----BEGIN ((?:RSA |EC )?PRIVATE KEY)-----/);
  const endMatch = key.match(/-----END ((?:RSA |EC )?PRIVATE KEY)-----/);

  if (!beginMatch) {
    return `GA4_PRIVATE_KEY is missing the "-----BEGIN PRIVATE KEY-----" header. ${ga4KeyHint()}`;
  }
  if (!endMatch) {
    return `GA4_PRIVATE_KEY is missing the "-----END PRIVATE KEY-----" footer. ${ga4KeyHint()}`;
  }

  // Ensure there is a non-empty base64 body between header and footer.
  const body = key
    .slice(key.indexOf(beginMatch[0]) + beginMatch[0].length, key.lastIndexOf(endMatch[0]))
    .replace(/\s+/g, "");
  if (body.length === 0) {
    return `GA4_PRIVATE_KEY has no key content between the header and footer. ${ga4KeyHint()}`;
  }

  return null;
}

function ga4KeyHint(): string {
  return (
    "Paste the full service-account key — either the escaped one-liner " +
    "(-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n) or the " +
    "multiline PEM."
  );
}

function ga4KeyConfigError(): string {
  return `GA4_PRIVATE_KEY could not be decoded by OpenSSL. ${ga4KeyHint()}`;
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

function json(status: number, data: unknown, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("", { status: 204 });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const auth = await verifyAdminAccessToken(token);
  if (!auth.ok) {
    return json(401, { error: auth.error });
  }

  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.GA4_PRIVATE_KEY ?? "");
  if (!propertyId || !clientEmail) {
    return json(500, {
      error: "GA4 is not configured. Set GA4_PROPERTY_ID, GA4_CLIENT_EMAIL and GA4_PRIVATE_KEY.",
    });
  }
  const keyError = validatePrivateKey(privateKey);
  if (keyError) {
    return json(500, { error: keyError });
  }

  let body: Ga4RequestBody = {};
  try {
    const raw = await req.text();
    body = raw ? (JSON.parse(raw) as Ga4RequestBody) : {};
  } catch {
    return json(400, { error: "Invalid JSON body" });
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
    return json(200, cached.payload, { "X-Cache": "HIT" });
  }

  const property = `properties/${propertyId}`;
  const dimensionFilter = pagePathFilter(prefix);

  try {
    const auth = new GoogleAuth({
      credentials: {
        type: "service_account",
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    });

    const client = new BetaAnalyticsDataClient({ auth });

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

    return json(200, payload, { "X-Cache": "MISS" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GA4 request failed.";
    if (message.includes("DECODER routines") || message.includes("unsupported")) {
      return json(502, { error: ga4KeyConfigError() });
    }
    return json(502, { error: `Google Analytics request failed: ${message}` });
  }
}
