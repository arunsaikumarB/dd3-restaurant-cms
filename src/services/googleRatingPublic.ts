import { createClientIfConfigured } from "../lib/supabase/client";
import type { LocationId } from "../config/locations";
import type { GoogleRatingStats } from "../types/database";

const CACHE_TTL_MS = 60_000;

const cachedStats = new Map<LocationId, GoogleRatingStats | null>();
const cacheExpiresAt = new Map<LocationId, number>();
const inflightRequests = new Map<LocationId, Promise<GoogleRatingStats | null>>();

/** Real aggregate Google rating + review count for a location, or null if not yet synced. */
export async function fetchGoogleRatingStats(
  locationId: LocationId,
): Promise<GoogleRatingStats | null> {
  const now = Date.now();
  const expiresAt = cacheExpiresAt.get(locationId) ?? 0;
  if (cachedStats.has(locationId) && now < expiresAt) {
    return cachedStats.get(locationId) ?? null;
  }

  const inflight = inflightRequests.get(locationId);
  if (inflight) return inflight;

  const request = (async () => {
    try {
      const supabase = createClientIfConfigured();
      if (!supabase) return null;

      const { data, error } = await supabase
        .from("google_rating_stats")
        .select("*")
        .eq("location_id", locationId)
        .maybeSingle();

      const result = error ? null : ((data as GoogleRatingStats | null) ?? null);
      cachedStats.set(locationId, result);
      cacheExpiresAt.set(locationId, Date.now() + CACHE_TTL_MS);
      return result;
    } finally {
      inflightRequests.delete(locationId);
    }
  })();

  inflightRequests.set(locationId, request);
  return request;
}
