import type { LocationId } from "../../../config/locations";
import type { ToolExecutionResult, ToolName } from "./types";

type CacheEntry = {
  result: ToolExecutionResult;
  expiresAt: number;
};

const CACHE_TTL_MS = 60_000;
const store = new Map<string, CacheEntry>();

function cacheKey(
  locationId: LocationId,
  tool: ToolName,
  knowledgeVersion: string,
): string {
  return `${locationId}:${tool}:${knowledgeVersion}`;
}

export function readToolCache(
  locationId: LocationId,
  tool: ToolName,
  knowledgeVersion: string,
): ToolExecutionResult | null {
  const key = cacheKey(locationId, tool, knowledgeVersion);
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return { ...entry.result, cached: true };
}

export function writeToolCache(
  locationId: LocationId,
  tool: ToolName,
  knowledgeVersion: string,
  result: ToolExecutionResult,
): void {
  const key = cacheKey(locationId, tool, knowledgeVersion);
  store.set(key, {
    result: { ...result, cached: false },
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/** Invalidate all cached tools for a location (e.g. after CMS refresh). */
export function invalidateLocationToolCache(locationId: LocationId): void {
  for (const key of store.keys()) {
    if (key.startsWith(`${locationId}:`)) {
      store.delete(key);
    }
  }
}

export function clearToolCache(): void {
  store.clear();
}
