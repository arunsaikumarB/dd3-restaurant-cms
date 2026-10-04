import { createHash } from "node:crypto";

const LOCAL_DEV_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8888",
  "http://127.0.0.1:8888",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

const SITE_ORIGIN_ENV_KEYS = ["VITE_SITE_URL", "URL", "DEPLOY_PRIME_URL", "DEPLOY_URL"] as const;

export const DEFAULT_MODEL_TIMEOUT_MS = 25_000;
export const DEFAULT_SMTP_TIMEOUT_MS = 20_000;
export const DEFAULT_RATE_WINDOW_SECONDS = 600;

type HeaderSource =
  | { get(name: string): string | null }
  | Record<string, string | undefined>
  | undefined;

type MemoryBucket = { windowStart: number; count: number };

const memoryBuckets = new Map<string, MemoryBucket>();

type SupabaseRateClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

let rateLimitClient: SupabaseRateClient | null | undefined;

export function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}

export function readHeader(headers: HeaderSource, name: string): string {
  if (!headers) return "";
  if (typeof (headers as { get?: unknown }).get === "function") {
    return (headers as { get(name: string): string | null }).get(name) ?? "";
  }
  const record = headers as Record<string, string | undefined>;
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(record)) {
    if (key.toLowerCase() === target && value) return value;
  }
  return "";
}

export function clientIp(headers: HeaderSource): string {
  const platformIp = readHeader(headers, "x-nf-client-connection-ip").trim();
  if (platformIp) return platformIp;
  const clientHeader = readHeader(headers, "client-ip").trim();
  if (clientHeader) return clientHeader;
  const forwarded = readHeader(headers, "x-forwarded-for").split(",")[0]?.trim() ?? "";
  return forwarded || "unknown";
}

function toOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function allowedOrigins(): Set<string> {
  const origins = new Set<string>();
  for (const raw of (process.env.ALLOWED_ORIGINS ?? "").split(",")) {
    const origin = toOrigin(raw);
    if (origin) origins.add(origin);
  }
  for (const key of SITE_ORIGIN_ENV_KEYS) {
    const origin = toOrigin(process.env[key]);
    if (origin) origins.add(origin);
  }
  const context = (process.env.CONTEXT ?? "").trim();
  const localDev = process.env.NETLIFY_DEV === "true" || context === "" || context === "dev";
  if (localDev) {
    for (const origin of LOCAL_DEV_ORIGINS) origins.add(origin);
  }
  return origins;
}

export function isOriginAllowed(origin: string | null, hosts: Array<string | null | undefined>): boolean {
  if (!origin) return true;
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  for (const host of hosts) {
    const normalized = host?.trim();
    if (normalized && parsed.host === normalized) return true;
  }
  return allowedOrigins().has(parsed.origin);
}

export function buildCorsHeaders(origin: string | null, allowed: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (allowed && origin) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

export type CorsDecision = {
  allowed: boolean;
  headers: Record<string, string>;
};

export function corsFor(headers: HeaderSource): CorsDecision {
  const origin = readHeader(headers, "origin").trim() || null;
  const hosts = [readHeader(headers, "host"), readHeader(headers, "x-forwarded-host")];
  const allowed = isOriginAllowed(origin, hosts);
  return { allowed, headers: buildCorsHeaders(origin, allowed) };
}

export function isBodyTooLarge(
  body: string | null | undefined,
  maxBytes: number,
  contentLengthHeader?: string,
): boolean {
  const declared = Number(contentLengthHeader ?? "");
  if (Number.isFinite(declared) && declared > maxBytes) return true;
  if (!body) return false;
  return Buffer.byteLength(body, "utf8") > maxBytes;
}

export type PublicFunctionName = "ai-concierge" | "submit-enquiry" | "semantic-search";

export function rateLimitSettings(name: PublicFunctionName): { limit: number; windowSeconds: number } {
  const windowSeconds = readPositiveInt("RATE_LIMIT_WINDOW_SECONDS", DEFAULT_RATE_WINDOW_SECONDS);
  const envName =
    name === "ai-concierge"
      ? "RATE_LIMIT_AI_CONCIERGE"
      : name === "submit-enquiry"
        ? "RATE_LIMIT_SUBMIT_ENQUIRY"
        : "RATE_LIMIT_SEMANTIC_SEARCH";
  const fallback = name === "ai-concierge" ? 60 : name === "submit-enquiry" ? 10 : 120;
  return { limit: readPositiveInt(envName, fallback), windowSeconds };
}

export function maxBodyBytes(name: PublicFunctionName | "semantic-index"): number {
  const envName =
    name === "ai-concierge"
      ? "MAX_BODY_BYTES_AI_CONCIERGE"
      : name === "submit-enquiry"
        ? "MAX_BODY_BYTES_SUBMIT_ENQUIRY"
        : name === "semantic-search"
          ? "MAX_BODY_BYTES_SEMANTIC_SEARCH"
          : "MAX_BODY_BYTES_SEMANTIC_INDEX";
  const fallback =
    name === "ai-concierge" ? 262_144 : name === "submit-enquiry" ? 32_768 : 16_384;
  return readPositiveInt(envName, fallback);
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

function hashIp(ip: string): string {
  return createHash("sha256").update(`dd3-rate:${ip}`).digest("hex").slice(0, 32);
}

function consumeMemory(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  if (memoryBuckets.size > 5000) {
    for (const [bucketKey, bucket] of memoryBuckets) {
      if (now - bucket.windowStart >= windowMs) memoryBuckets.delete(bucketKey);
    }
  }

  const current = memoryBuckets.get(key);
  if (!current || now - current.windowStart >= windowMs) {
    memoryBuckets.set(key, { windowStart: now, count: 1 });
    return { ok: true };
  }
  if (current.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - current.windowStart)) / 1000));
    return { ok: false, retryAfterSeconds };
  }
  current.count += 1;
  return { ok: true };
}

async function rateLimitSupabase(): Promise<SupabaseRateClient | null> {
  if (rateLimitClient !== undefined) return rateLimitClient;
  const url = process.env.VITE_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim() || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (!url || !serviceKey) {
    rateLimitClient = null;
    return null;
  }
  const { createClient } = await import("@supabase/supabase-js");
  rateLimitClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return rateLimitClient;
}

async function consumeRemote(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean | null> {
  try {
    const supabase = await rateLimitSupabase();
    if (!supabase) return null;
    const result = await withTimeout(
      supabase.rpc("consume_function_rate_limit", {
        p_bucket: key,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      }),
      1500,
    );
    if (result.error || typeof result.data !== "boolean") return null;
    return result.data;
  } catch {
    return null;
  }
}

export async function enforceRateLimit(name: PublicFunctionName, ip: string): Promise<RateLimitResult> {
  const { limit, windowSeconds } = rateLimitSettings(name);
  const key = `${name}:${hashIp(ip || "unknown")}`;
  const memory = consumeMemory(key, limit, windowSeconds * 1000);
  if (!memory.ok) return memory;
  const remote = await consumeRemote(key, limit, windowSeconds);
  if (remote === false) return { ok: false, retryAfterSeconds: windowSeconds };
  return { ok: true };
}

export function withTimeout<T>(work: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(Object.assign(new Error("Timed out"), { name: "TimeoutError" }));
    }, timeoutMs);
    Promise.resolve(work).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Abort the connection if response headers do not arrive in time.
 * The timer is cleared once headers arrive so a streaming body can continue.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function readJsonWithTimeout<T>(response: Response, timeoutMs: number): Promise<T> {
  return withTimeout(response.json() as Promise<T>, timeoutMs);
}

export function resetRequestGuardsForTests(): void {
  memoryBuckets.clear();
  rateLimitClient = undefined;
}
