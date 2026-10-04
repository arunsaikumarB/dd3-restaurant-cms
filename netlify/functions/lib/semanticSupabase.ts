import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/types/database";

export function readEnv(key: string): string {
  return process.env[key]?.trim() ?? "";
}

export function createSemanticServiceClient() {
  const url = readEnv("VITE_SUPABASE_URL") || readEnv("SUPABASE_URL");
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error("Supabase service role is not configured.");
  }
  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function jsonResponse(
  statusCode: number,
  body: Record<string, unknown>,
  extraHeaders?: Record<string, string>,
) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}
