/**
 * Enterprise Outbound AI Calling Platform — public API.
 */

export type * from "./types";

export { generateOutboundScript, outletDisplayName } from "./campaignBuilder";
export { generateVoicemail } from "./voicemailEngine";
export { validateOutboundCompliance, nextBusinessSlot } from "./complianceEngine";
export { buildAudience, todayIso } from "./audienceBuilder";
export { planFromTrigger } from "./triggerEngine";
export { scheduleJob, processDueJobs, listJobs } from "./scheduler";
export { scheduleRetry, processDueRetries } from "./retryManager";
export {
  placeOutboundCall,
  handleOutboundReservationIntent,
  completeOutboundCall,
} from "./outboundCallManager";
export {
  createCampaign,
  createCampaignFromTrigger,
  submitCampaignForApproval,
  approveCampaign,
  launchCampaign,
  listLocationCampaigns,
  queueManualCallback,
} from "./campaignEngine";
export { getOutboundAnalytics } from "./analytics";

export {
  listCampaigns,
  getCampaign,
  upsertCampaign,
  updateCampaignStatus,
  listTemplates,
  upsertTemplate,
  listCampaignRuns,
  listOutboundCalls,
  getOutboundCall,
  listOutboundOutcomes,
  listRetries,
  listOptOuts,
  addOptOut,
  getCompliance,
  upsertCompliance,
  listSchedulerJobs,
  insertOutboundCall,
} from "./repository";
