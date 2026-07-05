import { createClientIfConfigured } from "../lib/supabase/client";
import type { LocationId } from "../config/locations";
import type { SeoMetadata } from "../types/database";
import type { SeoMetadataForm, SeoPageKey } from "../types/seoMetadata";
import { rowToSeoForm } from "../utils/seo/seoDefaults";

const CACHE_TTL_MS = 60_000;

type CacheEntry = {
  expiresAt: number;
  byPage: Partial<Record<SeoPageKey, SeoMetadataForm>>;
};

const cacheByLocation: Partial<Record<LocationId, CacheEntry>> = {};
const inflightByLocation: Partial<Record<LocationId, Promise<Partial<Record<SeoPageKey, SeoMetadataForm>>>>> =
  {};

export function invalidateSeoMetadataCache(locationId?: LocationId): void {
  if (locationId) {
    delete cacheByLocation[locationId];
    delete inflightByLocation[locationId];
    return;
  }
  for (const key of Object.keys(cacheByLocation) as LocationId[]) {
    delete cacheByLocation[key];
  }
  for (const key of Object.keys(inflightByLocation) as LocationId[]) {
    delete inflightByLocation[key];
  }
}

async function fetchSeoMap(locationId: LocationId): Promise<Partial<Record<SeoPageKey, SeoMetadataForm>>> {
  const client = createClientIfConfigured();
  if (!client) return {};

  const { data, error } = await client.from("seo_metadata").select("*").eq("location_id", locationId);

  if (error || !data) return {};

  const map: Partial<Record<SeoPageKey, SeoMetadataForm>> = {};
  for (const row of data as SeoMetadata[]) {
    const pageKey = row.page_key as SeoPageKey;
    map[pageKey] = rowToSeoForm(row, locationId, pageKey);
  }
  return map;
}

export async function getSeoMetadataMap(
  locationId: LocationId,
): Promise<Partial<Record<SeoPageKey, SeoMetadataForm>>> {
  const now = Date.now();
  const cached = cacheByLocation[locationId];
  if (cached && now < cached.expiresAt) {
    return cached.byPage;
  }

  const inflight = inflightByLocation[locationId];
  if (inflight) return inflight;

  const request = fetchSeoMap(locationId).then((byPage) => {
    cacheByLocation[locationId] = { byPage, expiresAt: Date.now() + CACHE_TTL_MS };
    delete inflightByLocation[locationId];
    return byPage;
  });

  inflightByLocation[locationId] = request;
  return request;
}

export async function getPublicSeoMetadata(
  locationId: LocationId,
  pageKey: SeoPageKey,
): Promise<SeoMetadataForm | null> {
  const map = await getSeoMetadataMap(locationId);
  return map[pageKey] ?? null;
}
