/**
 * Campaign Engine — create, approve, launch outbound campaigns.
 */

import { nowIso } from "../client";
import { buildAudience } from "./audienceBuilder";
import { generateOutboundScript, outletDisplayName } from "./campaignBuilder";
import { generateVoicemail } from "./voicemailEngine";
import { placeOutboundCall } from "./outboundCallManager";
import { scheduleJob } from "./scheduler";
import { planFromTrigger } from "./triggerEngine";
import {
  getCampaign,
  getTemplateByCallType,
  insertCampaignRun,
  insertOutboundCall,
  listCampaigns,
  updateCampaignRun,
  updateCampaignStatus,
  upsertCampaign,
} from "./repository";
import type {
  AudienceFilter,
  OutboundCallType,
  OutboundCampaign,
  OutboundCampaignType,
  OutboundTriggerCode,
  RetryPolicy,
} from "./types";

export async function createCampaign(input: {
  locationId: string;
  name: string;
  description?: string;
  campaignType?: OutboundCampaignType;
  callType: OutboundCallType;
  triggerCode?: OutboundTriggerCode | null;
  audienceFilter?: AudienceFilter;
  immediate?: boolean;
  startAt?: string | null;
  retryPolicy?: RetryPolicy;
  approvalRequired?: boolean;
  createdBy?: string;
}): Promise<OutboundCampaign | null> {
  return upsertCampaign({
    locationId: input.locationId,
    name: input.name,
    description: input.description,
    campaignType: input.campaignType ?? "one_time",
    callType: input.callType,
    triggerCode: input.triggerCode,
    audienceFilter: input.audienceFilter ?? { locationId: input.locationId },
    schedule: {
      immediate: input.immediate ?? true,
      startAt: input.startAt ?? null,
      timezone: "America/New_York",
    },
    retryPolicy: input.retryPolicy,
    approvalRequired: input.approvalRequired !== false,
    createdBy: input.createdBy,
    status: "draft",
  });
}

export async function createCampaignFromTrigger(input: {
  locationId: string;
  trigger: OutboundTriggerCode;
  audienceExtras?: Partial<AudienceFilter>;
  createdBy?: string;
}): Promise<OutboundCampaign | null> {
  const plan = planFromTrigger(input.locationId, input.trigger, input.audienceExtras);
  return createCampaign({
    locationId: input.locationId,
    name: plan.name,
    campaignType: "event_triggered",
    callType: plan.callType,
    triggerCode: input.trigger,
    audienceFilter: plan.audienceFilter,
    createdBy: input.createdBy,
  });
}

export async function submitCampaignForApproval(campaignId: string): Promise<OutboundCampaign | null> {
  return updateCampaignStatus(campaignId, "pending_approval");
}

export async function approveCampaign(
  campaignId: string,
  approvedBy = "admin",
): Promise<OutboundCampaign | null> {
  return updateCampaignStatus(campaignId, "approved", approvedBy);
}

/**
 * Launch an approved (or draft if approval not required) campaign:
 * build audience → enqueue outbound calls → optionally dial immediately.
 */
export async function launchCampaign(input: {
  campaignId: string;
  dialNow?: boolean;
  simulateAnswered?: boolean;
  limit?: number;
}): Promise<{
  runId: string | null;
  queued: number;
  dialed: number;
  blocked: number;
  campaign: OutboundCampaign | null;
}> {
  const campaign = await getCampaign(input.campaignId);
  if (!campaign) {
    return { runId: null, queued: 0, dialed: 0, blocked: 0, campaign: null };
  }

  if (campaign.approvalRequired && campaign.status !== "approved" && campaign.status !== "running") {
    if (campaign.status === "draft") {
      await updateCampaignStatus(campaign.id, "pending_approval");
    }
    return { runId: null, queued: 0, dialed: 0, blocked: 0, campaign };
  }

  await updateCampaignStatus(campaign.id, "running");

  const audience = await buildAudience({
    locationId: campaign.locationId,
    filter: campaign.audienceFilter,
    limit: input.limit ?? 100,
  });

  const run = await insertCampaignRun({
    campaignId: campaign.id,
    locationId: campaign.locationId,
    audienceCount: audience.length,
  });

  const template = await getTemplateByCallType(campaign.locationId, campaign.callType);
  const outlet = outletDisplayName(campaign.locationId);
  let queued = 0;
  let dialed = 0;
  let blocked = 0;

  for (const member of audience) {
    const vars: Record<string, string> = {
      name: member.name,
      outlet,
      ...(member.vars ?? {}),
      offer: String(campaign.metadata.offer ?? "a special thank-you"),
    };
    const scriptText = generateOutboundScript({
      name: member.name,
      outlet,
      date: member.reservationDate ?? vars.date,
      time: member.reservationTime ?? vars.time,
      guests: member.guests ?? vars.guests,
      confirmationCode: member.confirmationCode ?? undefined,
      offer: vars.offer,
      callType: campaign.callType,
      scriptHint: template?.scriptHint,
      language: member.language,
    });
    const voicemailText = generateVoicemail({
      name: member.name,
      locationId: campaign.locationId,
      callType: campaign.callType,
      template,
      vars,
    });

    const call = await insertOutboundCall({
      campaignId: campaign.id,
      runId: run?.id,
      locationId: campaign.locationId,
      customerId: member.customerId,
      customerName: member.name,
      customerPhone: member.phone,
      callType: campaign.callType,
      maxAttempts: campaign.retryPolicy.maxAttempts,
      scheduledFor: campaign.schedule.immediate ? nowIso() : campaign.schedule.startAt ?? nowIso(),
      scriptText,
      voicemailText,
      reservationId: member.reservationId,
      confirmationCode: member.confirmationCode,
      plannerGoal: `outbound_${campaign.callType}`,
      contextPayload: {
        language: member.language,
        vars,
        retryPolicy: campaign.retryPolicy,
        reservationDate: member.reservationDate,
        reservationTime: member.reservationTime,
        guests: member.guests,
      },
    });

    if (!call) {
      blocked += 1;
      continue;
    }
    queued += 1;

    await scheduleJob({
      locationId: campaign.locationId,
      jobType: "outbound_dial",
      refId: call.id,
      immediate: Boolean(input.dialNow || campaign.schedule.immediate),
      payload: { callId: call.id },
    });

    if (input.dialNow || campaign.schedule.immediate) {
      const result = await placeOutboundCall({
        callId: call.id,
        simulate: input.simulateAnswered === false ? "no_answer" : "answered",
        hasMarketingConsent: true,
      });
      if (result.ok) dialed += 1;
      else if (result.call?.status === "compliance_blocked" || result.call?.status === "opted_out") {
        blocked += 1;
      }
    }
  }

  if (run) {
    await updateCampaignRun(run.id, {
      status: "completed",
      placedCount: queued,
      answeredCount: dialed,
      startedAt: nowIso(),
      completedAt: nowIso(),
    });
  }

  await updateCampaignStatus(campaign.id, "completed");

  return { runId: run?.id ?? null, queued, dialed, blocked, campaign: await getCampaign(campaign.id) };
}

export async function listLocationCampaigns(locationId: string) {
  return listCampaigns(locationId);
}

export async function queueManualCallback(input: {
  locationId: string;
  phone: string;
  name?: string;
  reason?: string;
}): Promise<{ campaignId: string | null; queued: number }> {
  const campaign = await createCampaign({
    locationId: input.locationId,
    name: `Manual callback · ${input.name ?? input.phone}`,
    description: input.reason,
    campaignType: "one_time",
    callType: "manual_staff_call",
    audienceFilter: { phones: [input.phone], locationId: input.locationId },
    approvalRequired: false,
    immediate: true,
  });
  if (!campaign) return { campaignId: null, queued: 0 };
  await updateCampaignStatus(campaign.id, "approved", "system");
  const launched = await launchCampaign({ campaignId: campaign.id, dialNow: false, limit: 1 });
  return { campaignId: campaign.id, queued: launched.queued };
}
