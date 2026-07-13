import { locationDisplayName } from "./reservationCollector";
import type { CollectedReservation, OccasionKind } from "./types";

export function buildConfirmationSummary(input: {
  collected: CollectedReservation;
  occasion?: OccasionKind;
}): string {
  const c = input.collected;
  const parts = [
    `Location: ${locationDisplayName(c.locationId)}`,
    c.date ? `Date: ${c.date}` : null,
    c.time ? `Time: ${c.time}` : null,
    c.guests ? `Guests: ${c.guests}` : null,
    c.customerName ? `Name: ${c.customerName}` : null,
    input.occasion || c.occasion ? `Occasion: ${input.occasion || c.occasion}` : null,
    c.specialRequests ? `Special requests: ${c.specialRequests}` : null,
  ].filter(Boolean);

  return `Just to confirm — ${parts.join(", ")}. Is everything correct?`;
}

export function formatSuccessConfirmation(input: {
  confirmationCode?: string | null;
  message?: string;
  collected: CollectedReservation;
}): string {
  const code = input.confirmationCode;
  const loc = locationDisplayName(input.collected.locationId);
  if (code) {
    return (
      `You're all set for ${loc}` +
      (input.collected.date ? ` on ${input.collected.date}` : "") +
      (input.collected.time ? ` at ${input.collected.time}` : "") +
      (input.collected.guests ? ` for ${input.collected.guests}` : "") +
      `. Your confirmation number is ${code}. We'll send a confirmation shortly. Is there anything else I can help with?`
    );
  }
  return (
    (input.message || "Your reservation has been updated.") +
    " Is there anything else I can help with?"
  );
}
