import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../../types/database";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "./env";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Browser Supabase client for React components and hooks.
 * Uses the anon key — safe to expose in the frontend.
 */
export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local",
    );
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      getSupabaseUrl(),
      getSupabaseAnonKey(),
    );
  }

  return browserClient;
}

/** Returns null when env vars are missing (e.g. UI-only local dev). */
export function createClientIfConfigured() {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}
