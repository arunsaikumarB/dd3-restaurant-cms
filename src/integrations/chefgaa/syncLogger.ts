import type { LocationId } from "../../config/locations";
import { CHEFGAA_LOCATION_DEFAULTS, DEFAULT_LEGACY_PARTNER_ID } from "./constants";
import { locationConfigTable, syncEventsTable, syncRunsTable } from "./db";
import { createChefGaaSyncClient } from "./supabaseClient";
import type { ChefGaaLocationIntegrationConfig, SyncTrigger } from "./types";

type LocationConfigRow = {
  location_id: LocationId;
  api_version: "legacy" | "v2";
  legacy_outlet_id: number | null;
  legacy_partner_id: number | null;
  legacy_order_type_id: number | null;
  v2_tenant_id: string | null;
  v2_store_id: string | null;
  v2_platform_slug: string | null;
  sync_enabled: boolean;
};

export async function loadLocationIntegrationConfig(
  locationId: LocationId,
): Promise<ChefGaaLocationIntegrationConfig> {
  const supabase = createChefGaaSyncClient();
  const { data, error } = await locationConfigTable(supabase)
    .select("*")
    .eq("location_id", locationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load ChefGaa config for ${locationId}: ${error.message}`);
  }

  const defaults = CHEFGAA_LOCATION_DEFAULTS[locationId];
  const row = data as LocationConfigRow | null;

  if (!row) {
    return {
      locationId,
      apiVersion: defaults.apiVersion,
      legacyOutletId: defaults.legacyOutletId ?? null,
      legacyPartnerId: DEFAULT_LEGACY_PARTNER_ID,
      legacyOrderTypeId: defaults.legacyOrderTypeId ?? null,
      v2TenantId: defaults.v2TenantId ?? null,
      v2StoreId: defaults.v2StoreId ?? null,
      v2PlatformSlug: defaults.v2PlatformSlug ?? null,
      syncEnabled: true,
    };
  }

  return {
    locationId,
    apiVersion: row.api_version,
    legacyOutletId: row.legacy_outlet_id,
    legacyPartnerId: row.legacy_partner_id ?? DEFAULT_LEGACY_PARTNER_ID,
    legacyOrderTypeId: row.legacy_order_type_id,
    v2TenantId: row.v2_tenant_id,
    v2StoreId: row.v2_store_id,
    v2PlatformSlug: row.v2_platform_slug,
    syncEnabled: row.sync_enabled,
  };
}

export async function startSyncRun(
  locationId: LocationId,
  trigger: SyncTrigger,
): Promise<string> {
  const supabase = createChefGaaSyncClient();
  const { data, error } = await syncRunsTable(supabase)
    .insert({
      location_id: locationId,
      trigger,
      status: "running",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create sync run: ${error?.message ?? "unknown error"}`);
  }

  return data.id;
}

export async function completeSyncRun(
  runId: string,
  payload: {
    status: "success" | "partial" | "failed";
    durationMs: number;
    categoriesCreated: number;
    categoriesUpdated: number;
    categoriesDeactivated: number;
    itemsCreated: number;
    itemsUpdated: number;
    itemsDeactivated: number;
    pricesChanged: number;
    itemsFailed: number;
    errorSummary: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const supabase = createChefGaaSyncClient();
  const { error } = await syncRunsTable(supabase)
    .update({
      status: payload.status,
      finished_at: new Date().toISOString(),
      duration_ms: payload.durationMs,
      categories_created: payload.categoriesCreated,
      categories_updated: payload.categoriesUpdated,
      categories_deactivated: payload.categoriesDeactivated,
      items_created: payload.itemsCreated,
      items_updated: payload.itemsUpdated,
      items_deactivated: payload.itemsDeactivated,
      prices_changed: payload.pricesChanged,
      items_failed: payload.itemsFailed,
      error_summary: payload.errorSummary,
      metadata: payload.metadata ?? {},
    })
    .eq("id", runId);

  if (error) {
    throw new Error(`Failed to finalize sync run ${runId}: ${error.message}`);
  }
}

export async function logSyncEvent(
  runId: string,
  level: "info" | "warn" | "error",
  message: string,
  context?: Record<string, unknown>,
): Promise<void> {
  const supabase = createChefGaaSyncClient();
  await syncEventsTable(supabase).insert({
    run_id: runId,
    level,
    message,
    context: context ?? null,
  });
}

export async function updateLocationSyncMetadata(
  locationId: LocationId,
  payload: {
    status: string;
    durationMs: number;
    error: string | null;
    catalogCategoryCount?: number;
    catalogItemCount?: number;
  },
): Promise<void> {
  const supabase = createChefGaaSyncClient();
  const updatePayload: Record<string, unknown> = {
    last_sync_at: new Date().toISOString(),
    last_sync_status: payload.status,
    last_sync_duration_ms: payload.durationMs,
    last_sync_error: payload.error,
  };

  if (payload.catalogCategoryCount != null) {
    updatePayload.chefgaa_catalog_category_count = payload.catalogCategoryCount;
  }
  if (payload.catalogItemCount != null) {
    updatePayload.chefgaa_catalog_item_count = payload.catalogItemCount;
  }

  await locationConfigTable(supabase).update(updatePayload).eq("location_id", locationId);
}

/** Mark orphaned `running` rows as failed (Netlify timeout / crash). */
export async function abandonStaleRunningRuns(staleAfterMs = 5 * 60 * 1000): Promise<number> {
  const supabase = createChefGaaSyncClient();
  const cutoff = new Date(Date.now() - staleAfterMs).toISOString();
  const { data, error } = await syncRunsTable(supabase)
    .update({
      status: "failed",
      finished_at: new Date().toISOString(),
      error_summary: "Sync abandoned — run exceeded time limit or process ended unexpectedly.",
    })
    .eq("status", "running")
    .lt("started_at", cutoff)
    .select("id");

  if (error) {
    console.warn("abandonStaleRunningRuns:", error.message);
    return 0;
  }
  return data?.length ?? 0;
}
