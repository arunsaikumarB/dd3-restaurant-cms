/**
 * Centralized deployment configuration (Vite build-time + runtime).
 * Set values in Netlify → Site configuration → Environment variables.
 */

function readEnv(key: string): string | undefined {
  const meta = import.meta.env as Record<string, string | undefined>;
  return meta[key];
}

/** Last-resort fallback when VITE_SITE_URL is unset in a production build. */
export const PRODUCTION_SITE_URL_FALLBACK = "https://desidhamakanj.net/lawrenceville";

/**
 * Public site origin used for canonical URLs, Open Graph, JSON-LD, and sitemap.
 * Demo/staging: set VITE_SITE_URL to your Netlify preview URL (e.g. https://dd3-demo.netlify.app).
 * Production: set VITE_SITE_URL to the live restaurant domain.
 */
export function getSiteUrl(): string {
  const fromEnv = readEnv("VITE_SITE_URL")?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  if (import.meta.env.DEV) {
    return "http://localhost:5173";
  }
  return PRODUCTION_SITE_URL_FALLBACK;
}

export function getSupabaseUrl(): string {
  return (
    readEnv("VITE_SUPABASE_URL") ??
    readEnv("NEXT_PUBLIC_SUPABASE_URL") ??
    ""
  );
}

export function getSupabaseAnonKey(): string {
  return (
    readEnv("VITE_SUPABASE_ANON_KEY") ??
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    ""
  );
}

/** Server-only — never import in client components. */
export function getSupabaseServiceRoleKey(): string {
  return readEnv("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

/** Allow unauthenticated admin access only during local dev without Supabase env vars. */
export function isAdminDevBypassEnabled(): boolean {
  return import.meta.env.DEV && !isSupabaseConfigured();
}
