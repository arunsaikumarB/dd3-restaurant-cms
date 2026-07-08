import type { LocationId } from "../../config/locations";
import type { SemanticChunkMatch, SemanticRetrievalResult } from "../../types/semanticKnowledge";

type CacheEntry = {
  expiresAt: number;
  result: SemanticRetrievalResult;
};

const CACHE_TTL_MS = 45_000;
const cache = new Map<string, CacheEntry>();

function cacheKey(
  query: string,
  locationId: LocationId,
  categories?: string[],
): string {
  return `${locationId}::${(categories ?? []).join(",")}::${query.trim().toLowerCase()}`;
}

export function readSemanticCache(
  query: string,
  locationId: LocationId,
  categories?: string[],
): SemanticRetrievalResult | null {
  const key = cacheKey(query, locationId, categories);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return { ...entry.result, cached: true };
}

export function writeSemanticCache(
  query: string,
  locationId: LocationId,
  result: SemanticRetrievalResult,
  categories?: string[],
): void {
  const key = cacheKey(query, locationId, categories);
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, result: { ...result, cached: false } });
}

export function invalidateSemanticCache(documentId?: string): void {
  if (!documentId) {
    cache.clear();
    return;
  }
  for (const [key, entry] of cache.entries()) {
    if (entry.result.chunks.some((c: SemanticChunkMatch) => c.documentId === documentId)) {
      cache.delete(key);
    }
  }
}

export function pruneSemanticCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) cache.delete(key);
  }
}
