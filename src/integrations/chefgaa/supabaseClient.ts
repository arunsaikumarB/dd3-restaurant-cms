import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database";

function readEnv(key: string): string | undefined {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };
  return runtime.process?.env?.[key];
}

/**
 * Service-role Supabase client for ChefGaa sync jobs (Node / Edge only).
 * Never import from React components.
 */
export function createChefGaaSyncClient() {
  const url =
    readEnv("VITE_SUPABASE_URL") ??
    readEnv("SUPABASE_URL") ??
    readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceKey) {
    throw new Error(
      "ChefGaa sync requires VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.",
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type ChefGaaSyncClient = ReturnType<typeof createChefGaaSyncClient>;
