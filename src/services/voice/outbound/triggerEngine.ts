import type { AudienceFilter, OutboundCallType, OutboundTriggerCode } from "./types";
import { todayIso } from "./audienceBuilder";

export type TriggerPlan = {
  callType: OutboundCallType;
  audienceFilter: AudienceFilter;
  name: string;
};

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Maps business / CRM / restaurant triggers → campaign audience plans.
 */
export function planFromTrigger(
  locationId: string,
  trigger: OutboundTriggerCode,
  extras?: Partial<AudienceFilter>,
): TriggerPlan {
  switch (trigger) {
    case "reservation_tomorrow":
      return {
        callType: "reservation_reminder",
        name: "Reservation reminders (tomorrow)",
        audienceFilter: {
          locationId,
          reservationDate: tomorrowIso(),
          hasUpcomingReservation: true,
          ...extras,
        },
      };
    case "reservation_today":
      return {
        callType: "same_day_reminder",
        name: "Same-day reservation reminders",
        audienceFilter: {
          locationId,
          reservationDate: todayIso(),
          hasUpcomingReservation: true,
          ...extras,
        },
      };
    case "reservation_created":
      return {
        callType: "reservation_confirmation",
        name: "New reservation confirmations",
        audienceFilter: {
          locationId,
          reservationDate: extras?.reservationDate ?? todayIso(),
          hasUpcomingReservation: true,
          ...extras,
        },
      };
    case "birthday":
      return {
        callType: "birthday_greeting",
        name: "Birthday greetings",
        audienceFilter: {
          locationId,
          birthdayMonth: new Date().getMonth() + 1,
          ...extras,
        },
      };
    case "anniversary":
      return {
        callType: "anniversary_greeting",
        name: "Anniversary greetings",
        audienceFilter: {
          locationId,
          anniversaryMonth: new Date().getMonth() + 1,
          ...extras,
        },
      };
    case "no_visit_90_days":
      return {
        callType: "lost_customer_reengagement",
        name: "Win-back (90+ days)",
        audienceFilter: { locationId, minDaysSinceVisit: 90, ...extras },
      };
    case "waitlist_available":
      return {
        callType: "waitlist_availability",
        name: "Waitlist availability",
        audienceFilter: { locationId, ...extras },
      };
    case "missed_call":
    case "manager_requested_callback":
    case "customer_requested_callback":
      return {
        callType: "missed_call_callback",
        name: "Callback queue",
        audienceFilter: { locationId, phones: extras?.phones, ...extras },
      };
    case "new_offer_published":
      return {
        callType: "special_promotions",
        name: "New offer outreach",
        audienceFilter: { locationId, ...extras },
      };
    case "loyalty_milestone":
      return {
        callType: "loyalty_reward",
        name: "Loyalty milestone",
        audienceFilter: { locationId, minVisits: 5, ...extras },
      };
    case "failed_reservation":
      return {
        callType: "reservation_modification_followup",
        name: "Failed reservation follow-up",
        audienceFilter: { locationId, ...extras },
      };
    case "crm_segment":
    default:
      return {
        callType: "special_promotions",
        name: "CRM segment campaign",
        audienceFilter: { locationId, segment: extras?.segment, ...extras },
      };
  }
}
