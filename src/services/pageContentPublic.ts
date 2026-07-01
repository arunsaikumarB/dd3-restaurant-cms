import { createClientIfConfigured } from "../lib/supabase/client";
import type { LocationId } from "../config/locations";
import type { PageContentPageKey } from "../config/pageContentSchema";

export type PageContentSectionKey = `${PageContentPageKey}:${string}`;

export type PageContentRow = {
  page: string;
  section: string;
  content: Record<string, unknown>;
};

const CACHE_TTL_MS = 60_000;

let cachedByLocation: Partial<Record<LocationId, Map<PageContentSectionKey, Record<string, unknown>>>> =
  {};
let cacheExpiresAtByLocation: Partial<Record<LocationId, number>> = {};
const inflightByLocation: Partial<
  Record<LocationId, Promise<Map<PageContentSectionKey, Record<string, unknown>>>>
> = {};

function sectionKey(page: string, section: string): PageContentSectionKey {
  return `${page}:${section}` as PageContentSectionKey;
}

function mapRows(rows: PageContentRow[]): Map<PageContentSectionKey, Record<string, unknown>> {
  const map = new Map<PageContentSectionKey, Record<string, unknown>>();
  for (const row of rows) {
    const content =
      row.content && typeof row.content === "object" && !Array.isArray(row.content)
        ? row.content
        : {};
    map.set(sectionKey(row.page, row.section), content);
  }
  return map;
}

export async function fetchPageContentMap(
  locationId: LocationId,
): Promise<Map<PageContentSectionKey, Record<string, unknown>>> {
  const now = Date.now();
  const cached = cachedByLocation[locationId];
  const expiresAt = cacheExpiresAtByLocation[locationId] ?? 0;

  if (cached && now < expiresAt) {
    return cached;
  }

  const inflight = inflightByLocation[locationId];
  if (inflight) {
    return inflight;
  }

  const request = (async () => {
    const client = createClientIfConfigured();
    if (!client) {
      return new Map<PageContentSectionKey, Record<string, unknown>>();
    }

    const { data, error } = await client
      .from("page_content")
      .select("page, section, content")
      .eq("location_id", locationId);

    if (error) {
      console.warn("[page_content] fetch failed:", error.message);
      return cached ?? new Map();
    }

    const map = mapRows((data ?? []) as PageContentRow[]);
    cachedByLocation[locationId] = map;
    cacheExpiresAtByLocation[locationId] = Date.now() + CACHE_TTL_MS;
    return map;
  })();

  inflightByLocation[locationId] = request;

  try {
    return await request;
  } finally {
    delete inflightByLocation[locationId];
  }
}

export function invalidatePageContentCache(locationId?: LocationId): void {
  if (locationId) {
    delete cachedByLocation[locationId];
    delete cacheExpiresAtByLocation[locationId];
    delete inflightByLocation[locationId];
    return;
  }

  cachedByLocation = {};
  cacheExpiresAtByLocation = {};
  for (const key of Object.keys(inflightByLocation) as LocationId[]) {
    delete inflightByLocation[key];
  }
}

export function getPageContentSectionFromMap(
  map: Map<PageContentSectionKey, Record<string, unknown>>,
  page: PageContentPageKey | string,
  section: string,
): Record<string, unknown> | undefined {
  return map.get(sectionKey(page, section));
}
