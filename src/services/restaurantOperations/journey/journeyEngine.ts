/**
 * Customer Journey Engine — lifecycle intelligence.
 * Uses CRM public APIs only; publishes campaigns to Workflow Event Bus.
 * Planner never calls this directly — Context Aggregator enrichment only.
 */

import {
  ensureLoyalty,
  findCustomerByIdentity,
  getCustomer,
  getCustomerTimeline,
  listMemory,
  listSegments as listCrmSegments,
  listVisits,
} from "../crm";
import { listEvents as listCateringEvents } from "../events/repository";
import { fireCampaignTriggers } from "./campaignTrigger";
import { computeEngagementScores } from "./engagementEngine";
import { resolveLifecycleStage } from "./lifecycleEngine";
import { syncMilestones, upcomingMilestones } from "./milestoneEngine";
import {
  calculateNextBestAction,
  generateAiRecommendations,
  persistRecommendation,
} from "./recommendationEngine";
import {
  getCustomerJourney,
  getSettings,
  insertHistory,
  insertJourneyEvent,
  insertScoreSnapshot,
  listJourneyEvents,
  listMilestones,
  listRecommendations,
  listRules,
  listSegments,
  listStages,
  upsertCustomerJourney,
} from "./repository";
import { evaluateRetention } from "./retentionEngine";
import { daysBetween } from "./client";
import type {
  CustomerJourney,
  JourneyContextPackage,
  JourneySignals,
} from "./types";
import { evaluateJourneyCondition } from "./lifecycleEngine";

function monthDayDiff(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const thisYear = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  let diff = daysBetween(now, thisYear);
  if (diff < -1) {
    const next = new Date(now.getFullYear() + 1, d.getMonth(), d.getDate());
    diff = daysBetween(now, next);
  }
  return diff;
}

export async function buildSignals(input: {
  locationId: string;
  customerId: string;
  phone?: string | null;
  message?: string;
}): Promise<JourneySignals | null> {
  const customer = await getCustomer(input.customerId);
  if (!customer) return null;

  const [visits, loyalty, timeline, memory, crmSegs, catering] = await Promise.all([
    listVisits(input.customerId, 100),
    ensureLoyalty(input.customerId),
    getCustomerTimeline(input.customerId, 100),
    listMemory(input.customerId),
    listCrmSegments(input.customerId),
    listCateringEvents({ locationId: input.locationId, limit: 50 }).catch(() => []),
  ]);

  const lastVisit = visits[0];
  const daysSinceLastVisit = lastVisit?.visitDate
    ? daysBetween(new Date(lastVisit.visitDate))
    : customer.lastVisit
      ? daysBetween(new Date(customer.lastVisit))
      : null;

  const cancelCount = timeline.filter((t) =>
    /cancel/i.test(`${t.eventType} ${t.title ?? ""}`),
  ).length;
  const noShowCount = timeline.filter((t) =>
    /no[_\s-]?show/i.test(`${t.eventType} ${t.title ?? ""}`),
  ).length;
  const positiveReviews = timeline.filter((t) =>
    /review.*(positive|5|great)/i.test(`${t.eventType} ${t.title ?? ""}`),
  ).length;
  const negativeReviews = timeline.filter((t) =>
    /complaint|negative|bad review/i.test(`${t.eventType} ${t.title ?? ""}`),
  ).length;
  const aiInteractions = memory.length + timeline.filter((t) => /ai|chat/i.test(t.eventType)).length;
  const familyVisits = visits.filter((v) =>
    /family|kids|child/i.test(`${v.occasion ?? ""} ${v.visitType}`),
  ).length;
  const cateringCount = catering.filter((e) => e.customerId === input.customerId).length;
  const reservationCount = Math.max(customer.visitCount, visits.length);

  const occasionHints: string[] = [];
  if (input.message && /corporate|office/i.test(input.message)) occasionHints.push("corporate");
  if (crmSegs.some((s) => /vip/i.test(s))) occasionHints.push("vip");

  return {
    customerId: input.customerId,
    locationId: input.locationId,
    reservationCount,
    visitCount: visits.length || customer.visitCount || 0,
    daysSinceLastVisit,
    loyaltyPoints: loyalty?.points ?? 0,
    loyaltyTier: loyalty?.tier ?? "silver",
    isVip: Boolean(customer.isVip) || /vip|gold|platinum/i.test(loyalty?.tier ?? ""),
    cancelCount,
    noShowCount,
    cateringCount,
    positiveReviews,
    negativeReviews,
    aiInteractions,
    familyVisits,
    birthdayInDays: monthDayDiff(customer.dateOfBirth),
    anniversaryInDays: monthDayDiff(customer.anniversary),
    occasionHints,
  };
}

export async function evaluateCustomerJourney(input: {
  locationId: string;
  customerId: string;
  message?: string;
}): Promise<{
  journey: CustomerJourney;
  context: JourneyContextPackage;
  recommendations: string[];
} | null> {
  const signals = await buildSignals(input);
  if (!signals) return null;

  const [existing, rules, settings, stages, segments] = await Promise.all([
    getCustomerJourney(input.locationId, input.customerId),
    listRules(input.locationId),
    getSettings(input.locationId),
    listStages(input.locationId),
    listSegments(input.locationId),
  ]);

  const currentStage = existing?.stageCode ?? "visitor";
  const { stage, matchedRule } = resolveLifecycleStage({
    currentStage,
    rules,
    signals,
  });

  // Reactivation detection
  let finalStage = stage;
  if (
    ["inactive", "at_risk", "win_back"].includes(currentStage) &&
    (signals.daysSinceLastVisit ?? 999) < 21 &&
    signals.visitCount > 0
  ) {
    finalStage = "reactivated";
  }

  const scores = computeEngagementScores(signals);
  const { achieved, newCodes } = await syncMilestones(signals);
  const nba = calculateNextBestAction({ stage: finalStage, signals, scores });
  await persistRecommendation(input.locationId, input.customerId, nba);

  const segmentCodes = segments
    .filter((s) =>
      evaluateJourneyCondition(s.condition, signals as unknown as Record<string, unknown>),
    )
    .map((s) => s.code);

  const stageChanged = finalStage !== currentStage;
  const journey = await upsertCustomerJourney({
    locationId: input.locationId,
    customerId: input.customerId,
    stageCode: finalStage,
    previousStage: stageChanged ? currentStage : existing?.previousStage ?? null,
    scores,
    nextBestAction: nba.title,
    nextBestActionReason: nba.reason,
    segmentCodes,
    metadata: { matchedRule: matchedRule?.code ?? null },
    stageChanged,
  });

  if (!journey) return null;

  if (stageChanged) {
    await insertHistory({
      customerId: input.customerId,
      locationId: input.locationId,
      fromStage: currentStage,
      toStage: finalStage,
      reason: matchedRule?.name ?? "lifecycle evaluation",
    });
    await insertJourneyEvent({
      locationId: input.locationId,
      customerId: input.customerId,
      eventType: "stage_change",
      title: `Journey: ${currentStage} → ${finalStage}`,
      summary: matchedRule?.name ?? null,
      source: "journey",
      payload: { from: currentStage, to: finalStage },
    });
  }

  await insertScoreSnapshot({
    customerId: input.customerId,
    locationId: input.locationId,
    scores,
  });

  const retention = evaluateRetention({
    signals,
    scores,
    inactiveDays: settings?.inactiveDays ?? 60,
  });

  await fireCampaignTriggers({
    signals,
    stage: finalStage,
    previousStage: currentStage,
    newMilestones: newCodes,
    enableCampaigns: settings?.enableCampaigns ?? true,
  });

  const stageName = stages.find((s) => s.code === finalStage)?.name ?? finalStage;
  const aiRecs = generateAiRecommendations({
    stage: finalStage,
    signals,
    scores,
    nba,
  });
  if (retention.actions.length) {
    aiRecs.push(...retention.actions.map((a) => `Retention: ${a}`));
  }

  const context: JourneyContextPackage = {
    customerId: input.customerId,
    stage: finalStage,
    stageName,
    relationshipScore: scores.relationshipScore,
    engagementScore: scores.engagementScore,
    churnRisk: scores.churnRisk,
    retentionScore: scores.retentionScore,
    nextBestAction: nba.title,
    nextBestActionReason: nba.reason,
    milestones: achieved.map((m) => m.title),
    upcomingMilestones: upcomingMilestones(signals),
    riskScore: scores.churnRisk,
    recommendedOffers: nba.offers,
    segments: segmentCodes,
    summary: `${stageName} · relationship ${scores.relationshipScore} · NBA: ${nba.title}`,
  };

  return { journey, context, recommendations: aiRecs };
}

/** Resolve journey context for AI Context Aggregator enrichment. */
export async function resolveJourneyContext(input: {
  locationId: string;
  message?: string;
  phone?: string | null;
  email?: string | null;
  customerId?: string | null;
}): Promise<JourneyContextPackage> {
  const empty: JourneyContextPackage = {
    customerId: null,
    stage: null,
    stageName: null,
    relationshipScore: 0,
    engagementScore: 0,
    churnRisk: 0,
    retentionScore: 0,
    nextBestAction: null,
    nextBestActionReason: null,
    milestones: [],
    upcomingMilestones: [],
    riskScore: 0,
    recommendedOffers: [],
    segments: [],
    summary: "",
  };

  try {
    let customerId = input.customerId ?? null;
    if (!customerId) {
      const phone =
        input.phone ??
        (input.message?.match(/(\+?\d[\d\s\-().]{8,}\d)/)?.[1]?.replace(/[^\d+]/g, "") ?? null);
      const found = await findCustomerByIdentity({
        locationId: input.locationId,
        phone,
        email: input.email ?? undefined,
      });
      customerId = found?.id ?? null;
    }
    if (!customerId) return empty;

    const result = await evaluateCustomerJourney({
      locationId: input.locationId,
      customerId,
      message: input.message,
    });
    return result?.context ?? empty;
  } catch {
    return empty;
  }
}

export async function getMergedCustomerTimeline(customerId: string, locationId: string) {
  const [crmTimeline, journeyEvents, milestones, recs] = await Promise.all([
    getCustomerTimeline(customerId, 50),
    listJourneyEvents({ customerId, locationId, limit: 50 }),
    listMilestones(customerId),
    listRecommendations({ customerId, status: "open" }),
  ]);

  const merged = [
    ...crmTimeline.map((t) => ({
      at: t.occurredAt,
      source: "crm",
      type: t.eventType,
      title: t.title ?? t.eventType,
      summary: t.summary,
    })),
    ...journeyEvents.map((e) => ({
      at: e.createdAt,
      source: e.source,
      type: e.eventType,
      title: e.title,
      summary: e.summary,
    })),
    ...milestones.map((m) => ({
      at: m.achievedAt,
      source: "milestone",
      type: "milestone",
      title: m.title,
      summary: m.milestoneCode,
    })),
    ...recs.map((r) => ({
      at: r.createdAt,
      source: "recommendation",
      type: r.actionCode,
      title: r.title,
      summary: r.reason,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return merged;
}
