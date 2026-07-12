/** Lightweight orchestrator cache — never used for reservation/CRM/payments. */

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

const store = new Map<string, CacheEntry>();

const DEFAULT_TTL_MS = 60_000;

export function readOrchestratorCache(key: string): unknown | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function writeOrchestratorCache(key: string, value: unknown, ttlMs = DEFAULT_TTL_MS): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheKey(parts: Array<string | number | null | undefined>): string {
  return parts.map((p) => String(p ?? "")).join(":");
}

export function clearOrchestratorCache(): void {
  store.clear();
}
