import { createClientIfConfigured } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/env";
import { getLocationConfig, LOCATION_IDS, type LocationId } from "../../config/locations";
import type { AdminLocationScope } from "../../admin/types/location";
import type { ActivityItem } from "../../admin/types";
import type { ChefGaaLocationConfig, ChefGaaSyncRun } from "../../types/database";
import { listChefGaaLocationConfigs } from "./locationConfig";
import {
  catalogCountsFromSyncRun,
  resolveChefGaaCatalogCount,
  sumChefGaaCatalogCounts,
} from "./catalogCounts";
import type {
  ChefGaaConnectionStatus,
  ChefGaaDashboardSummary,
  ChefGaaIntegrationOverview,
  ChefGaaLocationSyncSnapshot,
  ChefGaaSyncHealthStatus,
  ChefGaaSyncHistoryEntry,
  ChefGaaSyncResult,
} from "./types";

const SYNC_RUNS_LIMIT = 150;
/** Runs stuck in `running` longer than this are treated as abandoned (timeout / crash). */
const STALE_RUNNING_MS = 5 * 60 * 1000;

function formatLocationName(locationId: string): string {
  if (locationId === "all") return "All Locations";
  if (LOCATION_IDS.includes(locationId as LocationId)) {
    return getLocationConfig(locationId as LocationId).name;
  }
  return locationId;
}

function mapRunStatusToResult(status: ChefGaaSyncRun["status"]): ChefGaaSyncResult {
  if (status === "success") return "success";
  if (status === "partial") return "partial";
  if (status === "failed") return "failed";
  return "skipped";
}

function buildRunMessage(run: ChefGaaSyncRun): string {
  if (run.status === "running") return "Sync in progress…";
  if (run.error_summary) return run.error_summary;
  const parts: string[] = [];
  const categories = run.categories_created + run.categories_updated;
  const items = run.items_created + run.items_updated;
  if (categories > 0) parts.push(`${categories} categories`);
  if (items > 0) parts.push(`${items} menu items`);
  if (run.prices_changed > 0) parts.push(`${run.prices_changed} price changes`);
  if (run.items_deactivated > 0) parts.push(`${run.items_deactivated} deactivated`);
  return parts.length > 0 ? parts.join(" · ") : "Sync completed with no catalog changes.";
}

function isStaleRunningRun(run: ChefGaaSyncRun, now = Date.now()): boolean {
  if (run.status !== "running") return false;
  const started = new Date(run.started_at).getTime();
  if (!Number.isFinite(started)) return true;
  return now - started > STALE_RUNNING_MS;
}

/** True only for an in-flight run that is not stale and not superseded by newer location metadata. */
function isLocationActivelySyncing(
  locationId: string,
  runs: ChefGaaSyncRun[],
  dbConfig: ChefGaaLocationConfig | undefined,
  now = Date.now(),
): boolean {
  for (const run of runs) {
    if (run.location_id !== locationId || run.status !== "running") continue;
    if (isStaleRunningRun(run, now)) continue;
    if (dbConfig?.last_sync_at) {
      const lastSync = new Date(dbConfig.last_sync_at).getTime();
      const started = new Date(run.started_at).getTime();
      // Location already recorded a finished sync after this run started → orphaned row.
      if (Number.isFinite(lastSync) && Number.isFinite(started) && lastSync >= started) {
        continue;
      }
    }
    const superseded = runs.some((other) => {
      if (other.location_id !== locationId || other.status === "running") return false;
      if (!other.finished_at) return false;
      return new Date(other.finished_at).getTime() >= new Date(run.started_at).getTime();
    });
    if (superseded) continue;
    return true;
  }
  return false;
}

function scopeLocationIds(scope: AdminLocationScope): LocationId[] {
  return scope === "all" ? [...LOCATION_IDS] : [scope];
}

export function mapSyncRunToHistoryEntry(run: ChefGaaSyncRun): ChefGaaSyncHistoryEntry {
  const locationId = run.location_id as LocationId | "all";
  const catalogTotals = catalogCountsFromSyncRun(run);
  return {
    id: run.id,
    locationId,
    locationName: formatLocationName(run.location_id),
    startedAt: run.started_at,
    completedAt: run.finished_at,
    durationMs: run.duration_ms,
    status: run.status,
    result: mapRunStatusToResult(run.status),
    message: buildRunMessage(run),
    categoryCount: catalogTotals.categories,
    menuItemCount: catalogTotals.items,
    categoriesCreated: run.categories_created,
    categoriesUpdated: run.categories_updated,
    itemsCreated: run.items_created,
    itemsUpdated: run.items_updated,
    itemsDeactivated: run.items_deactivated,
    pricesChanged: run.prices_changed,
    errors: run.error_summary,
    triggeredBy: run.trigger,
  };
}

function deriveHealthStatus(
  config: ChefGaaLocationConfig | undefined,
  isRunning: boolean,
): ChefGaaSyncHealthStatus {
  if (isRunning) return "syncing";
  if (!config?.last_sync_at) return "never_synced";
  if (config.last_sync_status === "success") return "connected";
  if (config.last_sync_status === "failed" || config.last_sync_status === "partial") {
    return "failed";
  }
  return "never_synced";
}

function deriveConnectionStatus(health: ChefGaaSyncHealthStatus): ChefGaaConnectionStatus {
  if (health === "connected") return "connected";
  if (health === "syncing") return "pending";
  if (health === "failed") return "error";
  return "pending";
}

function computeSuccessRate(runs: ChefGaaSyncRun[]): number {
  const finished = runs.filter((run) => run.status !== "running");
  if (finished.length === 0) return 100;
  const successes = finished.filter((run) => run.status === "success").length;
  return Math.round((successes / finished.length) * 100);
}

function computeNextScheduledSync(configs: ChefGaaLocationConfig[]): string | null {
  const scheduled = configs.filter(
    (row) => row.sync_enabled && row.sync_schedule === "15m" && row.last_sync_at,
  );
  if (scheduled.length === 0) return null;

  const nextTimes = scheduled
    .map((row) => new Date(row.last_sync_at!).getTime() + 15 * 60 * 1000)
    .filter((value) => Number.isFinite(value));

  if (nextTimes.length === 0) return null;
  return new Date(Math.min(...nextTimes)).toISOString();
}

export async function fetchChefGaaLocationConfigsFromDb(): Promise<ChefGaaLocationConfig[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClientIfConfigured();
  if (!supabase) return [];

  const { data, error } = await supabase.from("chefgaa_location_config").select("*");
  if (error || !data) return [];
  return data as ChefGaaLocationConfig[];
}

export async function fetchChefGaaSyncRunsFromDb(limit = SYNC_RUNS_LIMIT): Promise<ChefGaaSyncRun[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClientIfConfigured();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("chefgaa_sync_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as ChefGaaSyncRun[];
}

function latestRunByLocation(runs: ChefGaaSyncRun[]): Map<string, ChefGaaSyncRun> {
  const map = new Map<string, ChefGaaSyncRun>();
  for (const run of runs) {
    if (!map.has(run.location_id)) {
      map.set(run.location_id, run);
    }
  }
  return map;
}

export async function buildLocationSnapshots(
  configs: ChefGaaLocationConfig[],
  runs: ChefGaaSyncRun[],
): Promise<ChefGaaLocationSyncSnapshot[]> {
  const latestByLocation = latestRunByLocation(runs);
  const staticConfigs = listChefGaaLocationConfigs();
  const now = Date.now();

  const snapshots = await Promise.all(
    staticConfigs.map(async (staticConfig) => {
      const dbConfig = configs.find((row) => row.location_id === staticConfig.locationId);
      const lastRun = latestByLocation.get(staticConfig.locationId);
      const finishedLastRun =
        lastRun && lastRun.status !== "running" && !isStaleRunningRun(lastRun, now)
          ? lastRun
          : runs.find(
              (r) =>
                r.location_id === staticConfig.locationId &&
                r.status !== "running",
            );
      const healthStatus = deriveHealthStatus(
        dbConfig,
        isLocationActivelySyncing(staticConfig.locationId, runs, dbConfig, now),
      );
      const [categoryCount, menuItemCount] = await Promise.all([
        resolveChefGaaCatalogCount("menu_categories", staticConfig.locationId, dbConfig),
        resolveChefGaaCatalogCount("menu_items", staticConfig.locationId, dbConfig),
      ]);

      const messageFromConfig = dbConfig?.last_sync_error || null;

      return {
        locationId: staticConfig.locationId,
        connectionStatus: deriveConnectionStatus(healthStatus),
        healthStatus,
        apiVersion: staticConfig.apiVersion,
        lastSyncAt: dbConfig?.last_sync_at ?? finishedLastRun?.finished_at ?? finishedLastRun?.started_at ?? null,
        categoryCount,
        menuItemCount,
        lastSyncDurationMs: dbConfig?.last_sync_duration_ms ?? finishedLastRun?.duration_ms ?? null,
        lastSyncResult: dbConfig?.last_sync_status
          ? mapRunStatusToResult(dbConfig.last_sync_status as ChefGaaSyncRun["status"])
          : finishedLastRun
            ? mapRunStatusToResult(finishedLastRun.status)
            : null,
        lastSyncMessage:
          messageFromConfig ??
          (finishedLastRun
            ? buildRunMessage(finishedLastRun)
            : dbConfig?.last_sync_status === "success"
              ? "Sync completed successfully."
              : "No sync has been run for this location yet."),
        categoriesImported: categoryCount,
        menuImported: menuItemCount,
        itemsUpdated: finishedLastRun ? finishedLastRun.items_updated : null,
        itemsDeactivated: finishedLastRun ? finishedLastRun.items_deactivated : null,
      } satisfies ChefGaaLocationSyncSnapshot;
    }),
  );

  return snapshots;
}

export async function fetchChefGaaOverviewData(): Promise<ChefGaaIntegrationOverview> {
  const [configs, runs] = await Promise.all([
    fetchChefGaaLocationConfigsFromDb(),
    fetchChefGaaSyncRunsFromDb(),
  ]);
  const locations = await buildLocationSnapshots(configs, runs);

  return {
    locations,
    syncEngineReady: isSupabaseConfigured(),
  };
}

export async function fetchChefGaaHistoryData(
  scope: AdminLocationScope = "all",
): Promise<ChefGaaSyncHistoryEntry[]> {
  const runs = await fetchChefGaaSyncRunsFromDb();
  const locationIds = new Set(scopeLocationIds(scope));

  return runs
    .filter((run) => scope === "all" || locationIds.has(run.location_id as LocationId))
    .map(mapSyncRunToHistoryEntry);
}

export async function fetchChefGaaDashboardSummary(
  scope: AdminLocationScope,
): Promise<ChefGaaDashboardSummary> {
  const locationIds = scopeLocationIds(scope);
  const [configs, runs] = await Promise.all([
    fetchChefGaaLocationConfigsFromDb(),
    fetchChefGaaSyncRunsFromDb(),
  ]);
  const [categories, menuItems] = await Promise.all([
    sumChefGaaCatalogCounts("menu_categories", locationIds, configs),
    sumChefGaaCatalogCounts("menu_items", locationIds, configs),
  ]);

  const scopedConfigs = configs.filter((row) => locationIds.includes(row.location_id));
  const scopedRuns = runs.filter((run) => locationIds.includes(run.location_id as LocationId));
  const locations = await buildLocationSnapshots(configs, runs);
  const scopedLocations = locations.filter((entry) => locationIds.includes(entry.locationId));

  const connectedLocations = scopedLocations.filter(
    (entry) => entry.healthStatus === "connected",
  ).length;
  const failedLocations = scopedLocations.filter((entry) => entry.healthStatus === "failed").length;

  const lastGlobalSync = scopedConfigs
    .map((row) => row.last_sync_at)
    .filter(Boolean)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] ?? null;

  const lastDuration =
    scopedConfigs.find((row) => row.last_sync_at === lastGlobalSync)?.last_sync_duration_ms ?? null;

  const autoSyncEnabled = scopedConfigs.some(
    (row) => row.sync_enabled && row.sync_schedule !== "manual",
  );
  const schedule = scopedConfigs.find((row) => row.sync_schedule !== "manual")?.sync_schedule ?? "manual";

  const apiVersions = [
    ...new Set(scopedLocations.map((entry) => entry.apiVersion.toUpperCase())),
  ].join(" · ");

  const failedSyncCount = scopedRuns.filter((run) => run.status === "failed").length;

  return {
    totalLocations: locationIds.length,
    connectedLocations,
    failedLocations,
    lastGlobalSync,
    totalCategories: categories,
    totalMenuItems: menuItems,
    connectionStatus:
      failedLocations > 0 ? "degraded" : connectedLocations > 0 ? "connected" : "disconnected",
    lastSyncAt: lastGlobalSync,
    nextScheduledSync: computeNextScheduledSync(scopedConfigs),
    lastSyncDurationMs: lastDuration,
    successRate: computeSuccessRate(scopedRuns),
    failedSyncCount,
    apiVersionLabel: apiVersions || "—",
    autoSyncEnabled,
    autoSyncInterval: schedule === "15m" ? "15 Minutes" : schedule === "hourly" ? "Hourly" : schedule === "daily" ? "Daily" : "Manual",
    locations: scopedLocations,
  };
}

function formatActivityTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function syncRunToActivity(run: ChefGaaSyncRun): ActivityItem {
  const locationName = formatLocationName(run.location_id);
  let action = "ChefGaa Sync Completed";
  let target = locationName;

  if (run.status === "running") {
    action = "ChefGaa Sync Started";
  } else if (run.status === "failed") {
    action = `${locationName} Sync Failed`;
    target = run.error_summary ?? "Sync error";
  } else if (run.items_created + run.items_updated > 0) {
    action = `${run.items_created + run.items_updated} Menu Items Synced`;
    target = locationName;
  } else if (run.categories_created > 0) {
    action = `${run.categories_created} Categories Imported`;
    target = locationName;
  } else if (run.prices_changed > 0) {
    action = "Price Updated";
    target = run.error_summary ?? locationName;
  } else if (run.status === "success") {
    action = "ChefGaa Sync Completed Successfully";
    target = locationName;
  }

  return {
    id: run.id,
    action,
    target,
    time: formatActivityTime(run.started_at),
    type: "integration",
  };
}

export async function fetchRecentSyncActivity(
  scope: AdminLocationScope = "all",
  limit = 8,
): Promise<ActivityItem[]> {
  const runs = await fetchChefGaaSyncRunsFromDb(limit * 2);
  const locationIds = new Set(scopeLocationIds(scope));

  return runs
    .filter((run) => scope === "all" || locationIds.has(run.location_id as LocationId))
    .slice(0, limit)
    .map(syncRunToActivity);
}

export type ChefGaaLiveBundle = {
  overview: ChefGaaIntegrationOverview;
  history: ChefGaaSyncHistoryEntry[];
  dashboard: ChefGaaDashboardSummary;
  activity: ActivityItem[];
};

let cachedBundle: { key: string; at: number; data: ChefGaaLiveBundle } | null = null;
const CACHE_TTL_MS = 5_000;

export async function fetchChefGaaLiveBundle(
  scope: AdminLocationScope,
  options: { force?: boolean } = {},
): Promise<ChefGaaLiveBundle> {
  const cacheKey = scope;
  const now = Date.now();
  if (
    !options.force &&
    cachedBundle &&
    cachedBundle.key === cacheKey &&
    now - cachedBundle.at < CACHE_TTL_MS
  ) {
    return cachedBundle.data;
  }

  const [configs, runs] = await Promise.all([
    fetchChefGaaLocationConfigsFromDb(),
    fetchChefGaaSyncRunsFromDb(),
  ]);

  const locationIds = scopeLocationIds(scope);
  const scopedConfigs = configs.filter((row) => locationIds.includes(row.location_id));
  const scopedRuns = runs.filter((run) => locationIds.includes(run.location_id as LocationId));

  const locations = await buildLocationSnapshots(configs, runs);
  const scopedLocations = locations.filter((entry) => locationIds.includes(entry.locationId));

  const [categories, menuItems] = await Promise.all([
    sumChefGaaCatalogCounts("menu_categories", locationIds, configs),
    sumChefGaaCatalogCounts("menu_items", locationIds, configs),
  ]);

  const connectedLocations = scopedLocations.filter(
    (entry) => entry.healthStatus === "connected",
  ).length;
  const failedLocations = scopedLocations.filter((entry) => entry.healthStatus === "failed").length;
  const lastGlobalSync =
    scopedConfigs
      .map((row) => row.last_sync_at)
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] ?? null;
  const lastDuration =
    scopedConfigs.find((row) => row.last_sync_at === lastGlobalSync)?.last_sync_duration_ms ?? null;
  const autoSyncEnabled = scopedConfigs.some(
    (row) => row.sync_enabled && row.sync_schedule !== "manual",
  );
  const schedule =
    scopedConfigs.find((row) => row.sync_schedule !== "manual")?.sync_schedule ?? "manual";

  const dashboard: ChefGaaDashboardSummary = {
    totalLocations: locationIds.length,
    connectedLocations,
    failedLocations,
    lastGlobalSync,
    totalCategories: categories,
    totalMenuItems: menuItems,
    connectionStatus:
      failedLocations > 0 ? "degraded" : connectedLocations > 0 ? "connected" : "disconnected",
    lastSyncAt: lastGlobalSync,
    nextScheduledSync: computeNextScheduledSync(scopedConfigs),
    lastSyncDurationMs: lastDuration,
    successRate: computeSuccessRate(scopedRuns),
    failedSyncCount: scopedRuns.filter((run) => run.status === "failed").length,
    apiVersionLabel: [...new Set(scopedLocations.map((entry) => entry.apiVersion.toUpperCase()))].join(
      " · ",
    ) || "—",
    autoSyncEnabled,
    autoSyncInterval:
      schedule === "15m"
        ? "15 Minutes"
        : schedule === "hourly"
          ? "Hourly"
          : schedule === "daily"
            ? "Daily"
            : "Manual",
    locations: scopedLocations,
  };

  const data: ChefGaaLiveBundle = {
    overview: { locations, syncEngineReady: isSupabaseConfigured() },
    history: runs
      .filter((run) => scope === "all" || locationIds.includes(run.location_id as LocationId))
      .map(mapSyncRunToHistoryEntry),
    dashboard,
    activity: runs
      .filter((run) => scope === "all" || locationIds.includes(run.location_id as LocationId))
      .slice(0, 8)
      .map(syncRunToActivity),
  };

  cachedBundle = { key: cacheKey, at: now, data };
  return data;
}

export function invalidateChefGaaLiveCache(): void {
  cachedBundle = null;
}
