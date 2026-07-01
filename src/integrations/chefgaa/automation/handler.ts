import type { LocationId } from "../../../config/locations";
import { createChefGaaSyncClient } from "../supabaseClient";
import { locationConfigAutomationTable } from "../db";
import { runOrchestratedSync, type OrchestratorRequest, type OrchestratorResult } from "./orchestrator";

export type { OrchestratorRequest, OrchestratorResult };

export { runOrchestratedSync, loadEnabledLocationIds } from "./orchestrator";
export { computeSyncMonitoringStats } from "./metrics";
export { emitSyncNotification } from "./notifications";

function readEnv(key: string): string | undefined {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };
  return runtime.process?.env?.[key];
}

/**
 * Verifies a Supabase access token belongs to an admin user.
 * Service role key stays server-side only.
 */
export async function verifyAdminAccessToken(accessToken: string): Promise<{
  ok: boolean;
  userId?: string;
  error?: string;
}> {
  const url =
    readEnv("VITE_SUPABASE_URL") ??
    readEnv("SUPABASE_URL") ??
    readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceKey) {
    return { ok: false, error: "Server Supabase credentials are not configured." };
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return { ok: false, error: "Invalid or expired session." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  const role = (profile as { role?: string } | null)?.role;
  if (profileError || !role || (role !== "admin" && role !== "staff")) {
    return { ok: false, error: "Admin access required." };
  }

  return { ok: true, userId: userData.user.id };
}

export async function handleChefGaaSyncHttpRequest(body: {
  locationId?: LocationId | null;
  requestedBy?: string | null;
}): Promise<OrchestratorResult> {
  return runOrchestratedSync({
    trigger: "manual",
    locationId: body.locationId ?? null,
    requestedBy: body.requestedBy ?? null,
    skipIfLocked: false,
    queueIfBusy: true,
  });
}

export async function handleChefGaaScheduledSync(): Promise<OrchestratorResult> {
  return runOrchestratedSync({
    trigger: "scheduled",
    requestedBy: "system",
    skipIfLocked: true,
    queueIfBusy: false,
  });
}

export async function fetchCatalogRevision(locationId: LocationId): Promise<number> {
  const supabase = createChefGaaSyncClient();
  const { data } = await locationConfigAutomationTable(supabase)
    .select("catalog_revision")
    .eq("location_id", locationId)
    .maybeSingle();

  return Number((data as { catalog_revision?: number } | null)?.catalog_revision ?? 0);
}
