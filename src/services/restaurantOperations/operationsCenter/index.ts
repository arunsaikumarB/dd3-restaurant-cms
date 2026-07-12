/** Restaurant Operations Center — Mission Control (consumes existing ops modules). */

export type * from "./types";

export {
  buildExecutiveDashboard,
  buildLiveOperations,
  searchOperations,
  buildCustomer360,
  buildPerformanceMetrics,
} from "./dashboardService";

export { computeRestaurantHealth } from "./operationsHealth";
export { buildForecasts, getStoredForecasts, forecastSummary } from "./forecastingEngine";
export { generateOpsInsights } from "./insightEngine";
export {
  syncOperationalAlerts,
  acknowledgeAlert,
  assignAlert,
  resolveAlert,
  getOpenAlerts,
} from "./alertCenter";
export { generateOpsReport, getOpsReports, downloadReportBlob } from "./reportEngine";
export { COMMAND_ACTIONS, runCommandAction } from "./commandCenter";
export type { CommandAction, CommandActionId } from "./commandCenter";
export { askOperationsCopilot, quickOpsAnswer } from "./operationsCopilot";
export { buildRealtimeFeed } from "./realtimeFeed";
export {
  listAlerts,
  listAnnouncements,
  listReports,
  getOpsSettings,
  upsertOpsSettings,
  insertAnnouncement,
  latestHealth,
  listSnapshots,
} from "./repository";
