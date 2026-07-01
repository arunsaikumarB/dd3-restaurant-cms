export type {
  ChefGaaApiVersion,
  ChefGaaLocationIntegrationConfig,
  NormalizedCategory,
  NormalizedMenuCatalog,
  NormalizedMenuItem,
  SyncAllSummary,
  SyncLocationSummary,
  SyncRunStatus,
  SyncTrigger,
} from "./types";

export { CHEFGAA_LOCATION_DEFAULTS, LEGACY_API_BASE_URL, V2_API_BASE_URL } from "./constants";
export { fetchLegacyMenuCatalog } from "./legacyClient";
export { fetchV2MenuCatalog } from "./v2Client";
export { mapLegacyMenuCatalog, mapV2MenuCatalog, downloadAndNormalizeMenu } from "./mapper";
export { syncCategories, loadCategoryIdMap } from "./syncCategories";
export { syncMenuItems } from "./syncMenu";
export { syncLocation } from "./syncLocation";
export { syncAll } from "./syncAll";
export { runOrchestratedSync, loadEnabledLocationIds } from "./automation/orchestrator";
export { computeSyncMonitoringStats } from "./automation/metrics";
export type { OrchestratorResult, OrchestratorRequest } from "./automation/orchestrator";
