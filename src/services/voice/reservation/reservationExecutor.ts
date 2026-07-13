/**
 * Executes reservations via existing Reservation Engine only.
 */

import {
  runReservationEngine,
} from "../../restaurantOperations/reservations";
import { syncCrmAfterReservation } from "../../restaurantOperations/crm";
import type { ReservationAction, ReservationEngineResult, ReservationGuestInput } from "../../restaurantOperations/reservations/types";

export async function executeReservation(input: {
  action: ReservationAction;
  locationId: string;
  fields: ReservationGuestInput;
  message?: string;
  conversationId?: string | null;
  history?: Array<{ role: string; content: string }>;
}): Promise<ReservationEngineResult> {
  const result = await runReservationEngine({
    action: input.action,
    locationId: input.locationId,
    fields: { ...input.fields, source: "voice", conversationId: input.conversationId },
    message: input.message,
    history: input.history,
    conversationId: input.conversationId,
  });

  // Soft CRM sync — never fail the reservation on CRM errors
  if (result.ok && result.reservation && (input.action === "create" || input.action === "modify")) {
    const r = result.reservation;
    try {
      await syncCrmAfterReservation({
        locationId: input.locationId,
        reservationId: r.id,
        customerName: r.customerName,
        phone: r.phone,
        email: r.email,
        date: r.date,
        time: r.time,
        guests: r.guests,
        occasion: r.occasion,
        highChair: r.highChair,
        outdoor: r.outdoorRequested,
        booth: r.boothRequested,
        window: r.windowRequested,
        dietary: r.dietaryRestrictions,
        tableId: r.tableId,
        status: r.status,
      });
    } catch {
      /* logged by caller via events */
    }
  }

  return result;
}
