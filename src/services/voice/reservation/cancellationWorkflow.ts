import { executeReservation } from "./reservationExecutor";
import type { CollectedReservation } from "./types";
import type { ReservationEngineResult } from "../../restaurantOperations/reservations/types";

/**
 * Cancel via Reservation Engine. Notify path is owned by the engine / ops platform.
 */
export async function runCancellationWorkflow(input: {
  locationId: string;
  fields: CollectedReservation;
  message: string;
  conversationId?: string | null;
  history?: Array<{ role: string; content: string }>;
}): Promise<ReservationEngineResult> {
  return executeReservation({
    action: "cancel",
    locationId: input.locationId,
    fields: input.fields,
    message: input.message,
    conversationId: input.conversationId,
    history: input.history,
  });
}
