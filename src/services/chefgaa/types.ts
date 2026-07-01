import type { LocationId } from "../../config/locations";

export type ChefGaaApiVersion = "legacy" | "v2";

export type ChefGaaConnectionStatus = "connected" | "pending" | "disconnected" | "error";

export type ChefGaaSyncHealthStatus = "connected" | "syncing" | "failed" | "never_synced";

export type ChefGaaSyncResult = "success" | "partial" | "failed" | "skipped";

export type ChefGaaSyncRunStatus = "running" | "success" | "partial" | "failed";

export type ChefGaaLocationConfig = {
  locationId: LocationId;
  name: string;
  apiVersion: ChefGaaApiVersion;
  /** Legacy API outlet header value (South Plainfield, Oak Tree). */
  outletId?: number;
  /** Legacy primary order type for deep links. */
  orderTypeId?: number;
  /** V2 BFF tenant header (Lawrenceville). */
  tenantId?: string;
  /** V2 BFF store header (Lawrenceville). */
  storeId?: string;
};

export type ChefGaaLocationSyncSnapshot = {
  locationId: LocationId;
  connectionStatus: ChefGaaConnectionStatus;
  healthStatus: ChefGaaSyncHealthStatus;
  apiVersion: ChefGaaApiVersion;
  lastSyncAt: string | null;
  categoryCount: number | null;
  menuItemCount: number | null;
  lastSyncDurationMs: number | null;
  lastSyncResult: ChefGaaSyncResult | null;
  lastSyncMessage: string | null;
  categoriesImported: number | null;
  menuImported: number | null;
  itemsUpdated: number | null;
  itemsDeactivated: number | null;
};

export type ChefGaaIntegrationOverview = {
  locations: ChefGaaLocationSyncSnapshot[];
  syncEngineReady: boolean;
};

export type ChefGaaDashboardSummary = {
  totalLocations: number;
  connectedLocations: number;
  failedLocations: number;
  lastGlobalSync: string | null;
  totalCategories: number;
  totalMenuItems: number;
  connectionStatus: "connected" | "disconnected" | "degraded";
  lastSyncAt: string | null;
  nextScheduledSync: string | null;
  lastSyncDurationMs: number | null;
  successRate: number;
  failedSyncCount: number;
  apiVersionLabel: string;
  autoSyncEnabled: boolean;
  autoSyncInterval: string;
  locations: ChefGaaLocationSyncSnapshot[];
};

export type ChefGaaSyncHistoryEntry = {
  id: string;
  locationId: LocationId | "all";
  locationName: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  status: ChefGaaSyncRunStatus;
  result: ChefGaaSyncResult;
  message: string;
  categoryCount: number | null;
  menuItemCount: number | null;
  categoriesCreated: number;
  categoriesUpdated: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsDeactivated: number;
  pricesChanged: number;
  errors: string | null;
  triggeredBy: "manual" | "scheduled" | "retry";
};

export type ChefGaaSyncRequest = {
  locationId?: LocationId;
  triggeredBy?: string;
};

export type ChefGaaSyncResponse = {
  accepted: boolean;
  message: string;
  historyEntry?: ChefGaaSyncHistoryEntry;
};
