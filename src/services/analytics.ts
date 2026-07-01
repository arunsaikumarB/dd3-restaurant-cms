import type { AnalyticsEventInsert } from "../types/database";
import { DEFAULT_PUBLIC_LOCATION_ID, type LocationId } from "../config/locations";
import { createClientIfConfigured } from "../lib/supabase/client";

type AnalyticsSupabase = {
  from: (table: "analytics_events") => {
    insert: (values: AnalyticsEventInsert) => Promise<{ error: { message: string } | null }>;
  };
};

const SESSION_KEY = "dd_session";
const OFFER_VIEWS_KEY = "dd_offer_views";

export type AnalyticsEventType =
  | "page_view"
  | "offer_view"
  | "offer_click"
  | "order_click"
  | "reservation_click";

export type AnalyticsDevice = "mobile" | "tablet" | "desktop";

export interface TrackEventPayload {
  event_type: AnalyticsEventType;
  page_path: string;
  location_id: LocationId;
  session_id: string;
  offer_id?: string;
  offer_title?: string;
  referrer?: string;
  device?: AnalyticsDevice;
  user_agent?: string;
}

function isTrackingEnabled(pathname: string): boolean {
  if (import.meta.env.DEV) return false;
  if (pathname.startsWith("/admin")) return false;
  return true;
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function getDevice(): AnalyticsDevice {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function readOfferViewSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(OFFER_VIEWS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeOfferViewSet(set: Set<string>): void {
  try {
    sessionStorage.setItem(OFFER_VIEWS_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore storage errors */
  }
}

export async function trackEvent(payload: TrackEventPayload): Promise<void> {
  if (!isTrackingEnabled(payload.page_path)) return;

  try {
    const supabase = createClientIfConfigured();
    if (!supabase) return;

    const row: AnalyticsEventInsert = {
      event_type: payload.event_type,
      page_path: payload.page_path,
      location_id: payload.location_id,
      session_id: payload.session_id,
      offer_id: payload.offer_id ?? null,
      offer_title: payload.offer_title ?? null,
      referrer: payload.referrer ?? null,
      device: payload.device ?? getDevice(),
      user_agent: payload.user_agent ?? (typeof navigator !== "undefined" ? navigator.userAgent : null),
    };

    const client = supabase as unknown as AnalyticsSupabase;
    await client.from("analytics_events").insert(row);
  } catch {
    /* analytics must never break the site */
  }
}

export function trackPageView(
  pagePath: string,
  locationId: LocationId | null,
): void {
  void trackEvent({
    event_type: "page_view",
    page_path: pagePath,
    location_id: locationId ?? DEFAULT_PUBLIC_LOCATION_ID,
    session_id: getSessionId(),
    referrer: typeof document !== "undefined" ? document.referrer : "",
    device: getDevice(),
  });
}

export function trackOfferView(
  offerId: string,
  offerTitle: string,
  locationId: LocationId,
  pagePath = "/offers",
): void {
  const dedupeKey = `${locationId}:${offerId}`;
  const seen = readOfferViewSet();
  if (seen.has(dedupeKey)) return;
  seen.add(dedupeKey);
  writeOfferViewSet(seen);

  void trackEvent({
    event_type: "offer_view",
    page_path: pagePath,
    location_id: locationId,
    session_id: getSessionId(),
    offer_id: offerId,
    offer_title: offerTitle,
    referrer: typeof document !== "undefined" ? document.referrer : "",
    device: getDevice(),
  });
}

export function trackOfferClick(
  offerId: string,
  offerTitle: string,
  locationId: LocationId,
  pagePath: string,
): void {
  void trackEvent({
    event_type: "offer_click",
    page_path: pagePath,
    location_id: locationId,
    session_id: getSessionId(),
    offer_id: offerId,
    offer_title: offerTitle,
    device: getDevice(),
  });
}

export function trackOrderClick(pagePath: string, locationId: LocationId | null): void {
  void trackEvent({
    event_type: "order_click",
    page_path: pagePath,
    location_id: locationId ?? DEFAULT_PUBLIC_LOCATION_ID,
    session_id: getSessionId(),
    device: getDevice(),
  });
}

export function trackReservationClick(pagePath: string, locationId: LocationId | null): void {
  void trackEvent({
    event_type: "reservation_click",
    page_path: pagePath,
    location_id: locationId ?? DEFAULT_PUBLIC_LOCATION_ID,
    session_id: getSessionId(),
    device: getDevice(),
  });
}
