import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "./env";

/**
 * Service-role Supabase client for trusted server-side scripts only.
 *
 * NEVER import this file from React components or any browser bundle.
 * Use only in Node scripts, CI, or future API routes.
 */
export function createServiceClient() {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();

  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or Supabase URL for server client.",
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
