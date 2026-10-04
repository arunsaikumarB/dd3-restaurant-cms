import type { LocationId } from "../../../config/locations";
import { createChefGaaSyncClient } from "../supabaseClient";
import { locationConfigAutomationTable } from "../db";
import { runOrchestratedSync, type OrchestratorRequest, type OrchestratorResult } from "./orchestrator";

export type { OrchestratorRequest, OrchestratorResult };

export { runOrchestratedSync, loadEnabledLocationIds } from "./orchestrator";
export { computeSyncMonitoringStats } from "./metrics";
export { emitSyncNotification } from "./notifications";
export { verifyAdminAccessToken } from "./verifyAdmin";

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
