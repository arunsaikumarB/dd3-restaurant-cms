/**
 * Shared Supabase environment variables.
 * Vite exposes VITE_* at build time; NEXT_PUBLIC_* is supported for compatibility.
 */
function readEnv(key: string): string | undefined {
  const meta = import.meta.env as Record<string, string | undefined>;
  return meta[key];
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
