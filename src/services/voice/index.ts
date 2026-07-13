export type * from "./types";
export type {
  CallSummary,
  HospitalityProfile,
  PersonalityProfile,
  SilenceRules,
  ReceptionistTurnResult,
  VoiceMemory,
} from "./receptionist";
export { voiceTable, newConversationId } from "./client";
export {
  getVoiceSettings,
  upsertVoiceSettings,
  getSession,
  listSessions,
  listEvents,
  listTranscripts,
  listRecordings,
  listCallMetrics,
  listProviderMetrics,
} from "./repository";

export {
  startVoiceSession,
  setCallState,
  heartbeat,
  reconnectVoiceSession,
  interruptSpeaking,
  endVoiceSession,
  listVoiceSessions,
  handleTelephonyEvent,
} from "./gateway/gateway";
export { processVoiceTurn, stopTtsForSession } from "./gateway/pipeline";

export { ensureSttProvidersRegistered } from "./stt/providers";
export { listSttProviders, getSttProvider, registerSttProvider } from "./stt/types";
export { ensureTtsProvidersRegistered } from "./tts/providers";
export { listTtsProviders, getTtsProvider, registerTtsProvider } from "./tts/types";

export { startVad, AudioBufferQueue } from "./streaming";
export { getVoiceAnalytics } from "./analytics/analytics";
export {
  maybeStartRecording,
  getSessionTranscriptBundle,
  getRecordingsForLocation,
} from "./recording/recording";

export * as receptionist from "./receptionist";
export * as voiceReservation from "./reservation";
export * as voiceHandoff from "./handoff";
export {
  startReceptionistCall,
  processReceptionistTurn,
  handleReceptionistSilence,
  interruptReceptionist,
  endReceptionistCall,
  getReceptionistLiveState,
  buildGreeting,
  getPersonality,
  upsertPersonality,
  getHospitality,
  upsertHospitality,
  getSilenceRules,
  upsertSilenceRules,
  listGreetingTemplates,
  upsertGreetingTemplate,
  listCallSummaries,
  getCallSummaryForSession,
  listEnabledLanguages,
} from "./receptionist";

export {
  processReservationTurn,
  isReservationIntent,
  listReservationCalls,
  listReservationEvents,
  listCallOutcomes,
  getReservationAnalyticsSnapshot,
  getActiveReservationCall,
} from "./reservation";
export type {
  VoiceReservationCall,
  VoiceReservationTurnResult,
  VoiceReservationWorkflow,
  VoiceReservationStage,
} from "./reservation";

export {
  handleStaffTransferRequest,
  maybeRecommendHandoff,
  getHandoffDashboard,
  getHandoffAnalytics,
  acceptTransfer,
  rejectTransfer,
  completeTransfer,
  missTransferAndCallback,
  queueTransfer,
  buildAgentAssist,
  getLiveTranscript,
  searchTranscript,
  transcriptToText,
  downloadTranscriptFilename,
  listDepartments,
  upsertDepartment,
  listLiveAgents,
  upsertLiveAgent,
  updateAgentStatus,
  listEscalationRules,
  upsertEscalationRule,
  listEscalations,
  listTransfers,
  listWaitingTransfers,
  getTransfer,
  listCallbacks,
  enqueueCallback,
  markCallbackDone,
  listCallTasks,
  insertStaffNote,
  listStaffNotes,
  listHandoffNotifications,
  canAcceptTransfer,
} from "./handoff";
export type {
  VoiceEscalation,
  VoiceTransfer,
  VoiceLiveAgent,
  VoiceDepartment,
  EscalationRule,
  HandoffDashboardSnapshot,
  HandoffAnalyticsSnapshot,
  AgentAssistBundle,
  CallbackQueueItem,
  TransferContextPayload,
  HandoffStaffRole,
} from "./handoff";

import { ensureSttProvidersRegistered as ensureStt } from "./stt/providers";
import { ensureTtsProvidersRegistered as ensureTts } from "./tts/providers";

/** Bootstrap provider registries (idempotent). */
export function bootstrapVoiceLayer(): void {
  ensureStt();
  ensureTts();
}
