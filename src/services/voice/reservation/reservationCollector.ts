import { LOCATION_IDS, LOCATIONS, type LocationId } from "../../../config/locations";
import {
  detectActionFromMessage,
  detectMissingFields,
  extractReservationFields,
} from "../../restaurantOperations/reservations";
import { findCustomerByIdentity } from "../../restaurantOperations/crm";
import type { ReservationGuestInput, MissingReservationField } from "../../restaurantOperations/reservations/types";
import type { CollectedReservation, OccasionKind, VoiceReservationWorkflow } from "./types";

const FOLLOW_UPS: Record<MissingReservationField, string> = {
  outlet: "Which of our locations would you like to visit — South Plainfield, Oak Tree, or Lawrenceville?",
  date: "What date would you like to reserve?",
  time: "What time works best for you?",
  guests: "About how many guests will be joining you?",
  customerName: "May I have a name for the reservation?",
  phone: "What's the best phone number to reach you at?",
  email: "Would you like a confirmation email as well?",
};

export function detectOutletFromText(text: string, fallbackLocationId: string): string {
  const t = text.toLowerCase();
  if (/south\s*plainfield|plainfield/.test(t)) return "south-plainfield";
  if (/oak\s*tree|edison/.test(t)) return "oak-tree";
  if (/lawrenceville/.test(t)) return "lawrenceville";
  return fallbackLocationId;
}

export function detectOccasion(text: string): OccasionKind {
  const t = text.toLowerCase();
  if (/\bbirthday\b/.test(t)) return "birthday";
  if (/\banniversary\b/.test(t)) return "anniversary";
  if (/\bbusiness\s*(meeting|dinner|lunch)\b/.test(t)) return "business";
  if (/\bdate\s*night\b/.test(t)) return "date_night";
  if (/\bgraduation\b/.test(t)) return "graduation";
  if (/\bfamily\b/.test(t)) return "family";
  if (/\bcorporate\b/.test(t)) return "corporate";
  if (/\bwedding\b/.test(t)) return "wedding";
  if (/\bbaby\s*shower\b/.test(t)) return "baby_shower";
  return null;
}

export function detectWorkflow(message: string): VoiceReservationWorkflow {
  const action = detectActionFromMessage(message);
  if (action === "cancel") return "cancel";
  if (action === "modify" || action === "reschedule") return "modify";
  if (action === "lookup") return "lookup";
  if (action === "availability") return "availability";
  if (action === "waitlist") return "waitlist";
  return "create";
}

export function isReservationIntent(message: string): boolean {
  const t = message.toLowerCase();
  return (
    /\b(reserv|book(ing)?(\s+a)?\s*table|table for|make a booking)\b/.test(t) ||
    /\b(cancel|modify|change|reschedule|update).{0,40}(reserv|booking|table)\b/.test(t) ||
    /\b(my reservation|confirmation code|waitlist)\b/.test(t) ||
    /\b(available|availability).{0,20}(table|tonight|tomorrow)\b/.test(t)
  );
}

export function mergeCollected(
  existing: CollectedReservation,
  extracted: ReservationGuestInput,
): CollectedReservation {
  return {
    ...existing,
    ...Object.fromEntries(
      Object.entries(extracted).filter(([, v]) => v !== undefined && v !== null && v !== ""),
    ),
    locationId: extracted.locationId || existing.locationId,
    dietaryRestrictions: extracted.dietaryRestrictions?.length
      ? extracted.dietaryRestrictions
      : existing.dietaryRestrictions,
  };
}

export async function collectFromUtterance(input: {
  message: string;
  locationId: string;
  existing: CollectedReservation;
  history?: Array<{ role: string; content: string }>;
}): Promise<{
  collected: CollectedReservation;
  missing: MissingReservationField[];
  nextQuestion: string | null;
  occasion: OccasionKind;
  workflowHint: VoiceReservationWorkflow;
}> {
  const outlet = detectOutletFromText(input.message, input.locationId);
  const extracted = extractReservationFields(input.message, outlet, input.history ?? []);
  const occasion = detectOccasion(input.message) ?? (extracted.occasion as OccasionKind) ?? null;
  if (occasion && !extracted.occasion) extracted.occasion = occasion;

  let collected = mergeCollected({ ...input.existing, locationId: outlet }, extracted);

  // Prefill from CRM when phone is known
  if (collected.phone && (!collected.customerName || !collected.email)) {
    try {
      const customer = await findCustomerByIdentity({
        locationId: collected.locationId,
        phone: collected.phone,
        email: collected.email,
      });
      if (customer) {
        const name = `${customer.firstName} ${customer.lastName}`.trim();
        collected = {
          ...collected,
          customerName: collected.customerName || name || undefined,
          email: collected.email || customer.email || undefined,
        };
      }
    } catch {
      /* CRM optional */
    }
  }

  const missing = detectMissingFields(collected);
  const next = missing[0] ? FOLLOW_UPS[missing[0]] : null;
  return {
    collected,
    missing,
    nextQuestion: next,
    occasion,
    workflowHint: detectWorkflow(input.message),
  };
}

export function locationDisplayName(locationId: string): string {
  if (LOCATION_IDS.includes(locationId as LocationId)) {
    return LOCATIONS[locationId as LocationId].name;
  }
  return locationId;
}

export { FOLLOW_UPS };
