import { listRegistry, registerEventType } from "./repository";
import type { EventRegistryEntry } from "./types";

export async function getEventRegistry(): Promise<EventRegistryEntry[]> {
  return listRegistry();
}

export async function registerPlatformEvent(input: {
  eventType: string;
  source: string;
  description?: string;
}): Promise<EventRegistryEntry | null> {
  return registerEventType(input);
}

/** Future POS / Payments / Voice register here without changing the engine. */
export const BUILTIN_EVENT_TYPES = [
  "ReservationCreated",
  "ReservationModified",
  "ReservationCancelled",
  "ReservationCheckedIn",
  "ReservationCompleted",
  "CustomerCreated",
  "CustomerUpdated",
  "CustomerBirthday",
  "LeadQualified",
  "ProposalGenerated",
  "QuoteApproved",
  "EventConfirmed",
  "PaymentReceived",
  "ReviewSubmitted",
  "ComplaintRaised",
  "LoyaltyTierChanged",
] as const;
