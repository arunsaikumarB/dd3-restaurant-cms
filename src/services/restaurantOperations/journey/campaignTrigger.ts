/**
 * Campaign triggers → existing Workflow Automation Event Bus.
 * Does not modify Workflow Automation internals.
 */

import { publishDomainEventSafe } from "../automation/eventBus";
import { insertCampaign, insertJourneyEvent } from "./repository";
import type { JourneySignals } from "./types";

export async function fireCampaignTriggers(input: {
  signals: JourneySignals;
  stage: string;
  previousStage: string | null;
  newMilestones: string[];
  enableCampaigns: boolean;
}): Promise<string[]> {
  if (!input.enableCampaigns) return [];
  const fired: string[] = [];
  const { signals } = input;

  const publish = async (
    triggerType: string,
    campaignKey: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) => {
    publishDomainEventSafe({
      eventType,
      source: "crm",
      entityType: "customer",
      entityId: signals.customerId,
      locationId: signals.locationId,
      correlationId: `journey-${signals.customerId}-${campaignKey}`,
      idempotencyKey: `journey:${signals.customerId}:${campaignKey}:${new Date().toISOString().slice(0, 10)}`,
      payload: {
        ...payload,
        customerId: signals.customerId,
        stage: input.stage,
        campaignKey,
      },
    });
    await insertCampaign({
      locationId: signals.locationId,
      customerId: signals.customerId,
      triggerType,
      campaignKey,
      payload,
    });
    await insertJourneyEvent({
      locationId: signals.locationId,
      customerId: signals.customerId,
      eventType: "campaign_trigger",
      title: `Campaign: ${campaignKey}`,
      summary: triggerType,
      source: "journey",
      payload,
    });
    fired.push(campaignKey);
  };

  if (signals.birthdayInDays != null && signals.birthdayInDays >= 0 && signals.birthdayInDays <= 7) {
    await publish("birthday", "birthday_campaign", "CustomerBirthday", {
      birthdayInDays: signals.birthdayInDays,
    });
  }

  if (
    signals.anniversaryInDays != null &&
    signals.anniversaryInDays >= 0 &&
    signals.anniversaryInDays <= 7
  ) {
    await publish("anniversary", "anniversary_campaign", "CustomerUpdated", {
      anniversaryInDays: signals.anniversaryInDays,
    });
  }

  if (input.stage === "inactive" || input.stage === "at_risk") {
    await publish("inactive", "inactive_winback", "CustomerUpdated", {
      daysSinceLastVisit: signals.daysSinceLastVisit,
    });
  }

  if (input.stage === "vip" && input.previousStage !== "vip") {
    await publish("reached_vip", "vip_welcome", "LoyaltyTierChanged", {
      tier: "vip",
    });
  }

  if (input.newMilestones.includes("loyalty_100") || input.newMilestones.includes("gold_tier")) {
    await publish("loyalty_upgrade", "loyalty_upgrade", "LoyaltyTierChanged", {
      milestones: input.newMilestones,
    });
  }

  for (const m of input.newMilestones) {
    await publish("milestone", `milestone_${m}`, "CustomerUpdated", { milestone: m });
  }

  if (signals.positiveReviews > 0 && input.newMilestones.includes("positive_review")) {
    await publish("positive_review", "thank_review", "ReviewSubmitted", {
      sentiment: "positive",
    });
  }

  if (signals.negativeReviews > 0) {
    await publish("negative_review", "recover_review", "ComplaintRaised", {
      sentiment: "negative",
    });
  }

  if (signals.cateringCount >= 1 && input.newMilestones.includes("first_catering")) {
    await publish("first_catering", "catering_nurture", "LeadQualified", {
      cateringCount: signals.cateringCount,
    });
  }

  if (signals.reservationCount >= 1 && input.previousStage === "visitor") {
    await publish("first_reservation", "first_reservation_welcome", "ReservationCreated", {
      reservationCount: signals.reservationCount,
    });
  }

  return fired;
}
