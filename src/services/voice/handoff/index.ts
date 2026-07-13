/**
 * Human Handoff & Live Staff Collaboration — public API.
 */

export type * from "./types";

export {
  evaluateEscalation,
  buildEscalationSuggestedAction,
} from "./escalationEngine";

export {
  canAcceptTransfer,
  findBestAgent,
  listAvailableAgents,
  warmTransferIntro,
  coldTransferHold,
  unavailableStaffMessage,
} from "./routingEngine";

export { buildTransferContext } from "./liveAgentBridge";

export {
  queueTransfer,
  acceptTransfer,
  rejectTransfer,
  completeTransfer,
  missTransferAndCallback,
} from "./transferManager";

export { buildAgentAssist } from "./agentAssist";

export {
  getLiveTranscript,
  searchTranscript,
  transcriptToText,
  downloadTranscriptFilename,
} from "./transcriptManager";

export {
  enqueueCallback,
  markCallbackDone,
  createTasksFromWrapUp,
} from "./callbackManager";

export { generateWrapUp } from "./wrapUpGenerator";

export { notifyHandoffChannels } from "./notifications";

export {
  listDepartments,
  upsertDepartment,
  listLiveAgents,
  upsertLiveAgent,
  updateAgentStatus,
  listEscalationRules,
  upsertEscalationRule,
  listEscalations,
  getOpenEscalationForSession,
  insertEscalation,
  updateEscalation,
  listTransfers,
  listWaitingTransfers,
  getTransfer,
  listCallbacks,
  listCallTasks,
  insertStaffNote,
  listStaffNotes,
  listHandoffNotifications,
  insertCallTask,
} from "./repository";

export {
  handleStaffTransferRequest,
  maybeRecommendHandoff,
  getHandoffDashboard,
  getHandoffAnalytics,
} from "./orchestrator";
