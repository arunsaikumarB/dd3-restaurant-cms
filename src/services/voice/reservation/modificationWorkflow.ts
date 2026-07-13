import { executeReservation } from "./reservationExecutor";
import { checkLiveAvailability } from "./availabilityChecker";
import type { CollectedReservation } from "./types";
import type { ReservationEngineResult } from "../../restaurantOperations/reservations/types";

/**
 * Modify / reschedule via Reservation Engine.
 * Caller must verify identity (name/phone/confirmation) before calling.
 */
export async function runModificationWorkflow(input: {
  locationId: string;
  fields: CollectedReservation;
  message: string;
  conversationId?: string | null;
  history?: Array<{ role: string; content: string }>;
}): Promise<{
  result: ReservationEngineResult;
  availabilityBlocked: boolean;
  alternatives: string[];
}> {
  if (input.fields.date && input.fields.time && input.fields.guests) {
    const avail = await checkLiveAvailability({
      locationId: input.locationId,
      date: input.fields.date,
      time: input.fields.time,
      guests: input.fields.guests,
    });
    if (!avail.available) {
      return {
        result: {
          ok: false,
          action: "modify",
          message: avail.reason ?? "That time is not available.",
          missingFields: [],
          followUpQuestion: null,
          reservation: null,
          slots: avail.slots,
          waitlist: null,
          data: { suggestedSlots: avail.alternatives },
        },
        availabilityBlocked: true,
        alternatives: avail.alternatives,
      };
    }
  }

  const result = await executeReservation({
    action: "modify",
    locationId: input.locationId,
    fields: input.fields,
    message: input.message,
    conversationId: input.conversationId,
    history: input.history,
  });

  return { result, availabilityBlocked: false, alternatives: [] };
}
