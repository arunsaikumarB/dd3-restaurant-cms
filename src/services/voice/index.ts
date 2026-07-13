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

import { ensureSttProvidersRegistered as ensureStt } from "./stt/providers";
import { ensureTtsProvidersRegistered as ensureTts } from "./tts/providers";

/** Bootstrap provider registries (idempotent). */
export function bootstrapVoiceLayer(): void {
  ensureStt();
  ensureTts();
}
