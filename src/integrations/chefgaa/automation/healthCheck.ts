import { getLocationConfig, type LocationId } from "../../../config/locations";
import { LEGACY_API_BASE_URL, V2_API_BASE_URL, V2_PLATFORM_HEADER } from "../constants";
import { apiHealthTable, locationConfigAutomationTable } from "../db";
import { loadLocationIntegrationConfig } from "../syncLogger";
import { createChefGaaSyncClient } from "../supabaseClient";
import type { ChefGaaLocationIntegrationConfig } from "../types";
import { emitSyncNotification } from "./notifications";

export type ApiHealthStatus = "healthy" | "warning" | "offline";

export type LocationHealthResult = {
  locationId: LocationId;
  status: ApiHealthStatus;
  responseTimeMs: number;
  authOk: boolean;
  dataReceived: boolean;
  errorMessage: string | null;
};

async function probeLegacyHealth(config: ChefGaaLocationIntegrationConfig): Promise<LocationHealthResult> {
  const started = Date.now();
  const outletId = config.legacyOutletId;
  if (!outletId) {
    return {
      locationId: config.locationId,
      status: "offline",
      responseTimeMs: 0,
      authOk: false,
      dataReceived: false,
      errorMessage: "Missing legacy outlet id",
    };
  }

  try {
    const response = await fetch(`${LEGACY_API_BASE_URL}/menu-item`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        outlet: String(outletId),
        partner: String(config.legacyPartnerId),
      },
    });
    const responseTimeMs = Date.now() - started;
    const authOk = response.status !== 401 && response.status !== 403;
    const dataReceived = response.ok;
    let status: ApiHealthStatus = "healthy";
    if (!response.ok) status = response.status >= 500 ? "offline" : "warning";
    if (responseTimeMs > 8_000) status = status === "healthy" ? "warning" : status;

    return {
      locationId: config.locationId,
      status,
      responseTimeMs,
      authOk,
      dataReceived,
      errorMessage: dataReceived ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      locationId: config.locationId,
      status: "offline",
      responseTimeMs: Date.now() - started,
      authOk: false,
      dataReceived: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

async function probeV2Health(config: ChefGaaLocationIntegrationConfig): Promise<LocationHealthResult> {
  const started = Date.now();
  const tenantId = config.v2TenantId;
  const storeId = config.v2StoreId;
  const slug = config.v2PlatformSlug ?? "online-ordering";

  if (!tenantId || !storeId) {
    return {
      locationId: config.locationId,
      status: "offline",
      responseTimeMs: 0,
      authOk: false,
      dataReceived: false,
      errorMessage: "Missing V2 tenant/store ids",
    };
  }

  try {
    const response = await fetch(
      `${V2_API_BASE_URL}/api/v1/public/menu/platforms/slug/${encodeURIComponent(slug)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "x-platform": V2_PLATFORM_HEADER,
          "tenant-id": tenantId,
          "store-id": storeId,
        },
      },
    );
    const responseTimeMs = Date.now() - started;
    const authOk = response.status !== 401 && response.status !== 403;
    let dataReceived = false;
    if (response.ok) {
      const json = (await response.json()) as { success?: boolean; data?: { id?: string } };
      dataReceived = Boolean(json.success && json.data?.id);
    }

    let status: ApiHealthStatus = dataReceived ? "healthy" : "warning";
    if (!response.ok && response.status >= 500) status = "offline";
    if (!response.ok && !dataReceived) status = "offline";
    if (responseTimeMs > 8_000 && status === "healthy") status = "warning";

    return {
      locationId: config.locationId,
      status,
      responseTimeMs,
      authOk,
      dataReceived,
      errorMessage: dataReceived ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      locationId: config.locationId,
      status: "offline",
      responseTimeMs: Date.now() - started,
      authOk: false,
      dataReceived: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function checkLocationHealth(
  config: ChefGaaLocationIntegrationConfig,
): Promise<LocationHealthResult> {
  const result =
    config.apiVersion === "legacy"
      ? await probeLegacyHealth(config)
      : await probeV2Health(config);

  const supabase = createChefGaaSyncClient();
  await apiHealthTable(supabase).insert({
    location_id: result.locationId,
    status: result.status,
    response_time_ms: result.responseTimeMs,
    auth_ok: result.authOk,
    data_received: result.dataReceived,
    error_message: result.errorMessage,
  });

  const apiHealthStatus =
    result.status === "healthy"
      ? "healthy"
      : result.status === "warning"
        ? "warning"
        : "offline";

  await locationConfigAutomationTable(supabase)
    .update({
      api_health_status: apiHealthStatus,
      last_health_check_at: new Date().toISOString(),
    })
    .eq("location_id", result.locationId);

  if (result.status === "offline") {
    await emitSyncNotification({
      eventType: "api_offline",
      locationId: result.locationId,
      message: `ChefGaa Offline — ${getLocationConfig(result.locationId).name}`,
      severity: "critical",
      metadata: { error: result.errorMessage },
    });
  }

  return result;
}

export async function runHealthChecksForLocations(
  locationIds: LocationId[],
): Promise<LocationHealthResult[]> {
  const results: LocationHealthResult[] = [];
  for (const locationId of locationIds) {
    const config = await loadLocationIntegrationConfig(locationId);
    if (!config.syncEnabled) continue;
    results.push(await checkLocationHealth(config));
  }
  return results;
}
