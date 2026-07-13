import { executeReservation } from "./reservationExecutor";
import { insertWaitlistEvent } from "./repository";
import type { CollectedReservation } from "./types";
import type { ReservationEngineResult } from "../../restaurantOperations/reservations/types";

export async function runWaitlistWorkflow(input: {
  locationId: string;
  fields: CollectedReservation;
  message: string;
  conversationId?: string | null;
  sessionId?: string | null;
  history?: Array<{ role: string; content: string }>;
}): Promise<ReservationEngineResult> {
  const result = await executeReservation({
    action: "waitlist",
    locationId: input.locationId,
    fields: input.fields,
    message: input.message,
    conversationId: input.conversationId,
    history: input.history,
  });

  try {
    await insertWaitlistEvent({
      sessionId: input.sessionId ?? undefined,
      locationId: input.locationId,
      waitlistId: result.waitlist?.id,
      guestName: input.fields.customerName,
      phone: input.fields.phone,
      partySize: input.fields.guests,
      eventType: result.ok ? "joined" : "failed",
      payload: {
        preferredDate: input.fields.date ?? null,
        preferredTime: input.fields.time ?? null,
        message: result.message,
      },
    });
  } catch {
    /* observability only */
  }

  return result;
}
