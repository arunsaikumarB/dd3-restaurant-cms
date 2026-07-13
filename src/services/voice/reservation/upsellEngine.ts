import type { OccasionKind, UpsellSuggestion } from "./types";

/**
 * Soft upsell hints — never forced. Uses occasion + party size only.
 * Actual packages / offers live in Restaurant Operations; this only suggests language.
 */
export function suggestUpsells(input: {
  occasion: OccasionKind;
  guests?: number;
  specialRequests?: string;
}): UpsellSuggestion[] {
  const out: UpsellSuggestion[] = [];
  const g = input.guests ?? 0;

  if (input.occasion === "birthday") {
    out.push({
      kind: "party_package",
      message: "Would you like me to note a birthday celebration package or dessert for the table?",
    });
  }
  if (input.occasion === "anniversary" || input.occasion === "date_night") {
    out.push({
      kind: "window_seating",
      message: "I can request a quieter window table for your evening — would you like that?",
    });
  }
  if (input.occasion === "family" || /\bkids?\b|children|high.?chair/i.test(input.specialRequests ?? "")) {
    out.push({
      kind: "kids_menu",
      message: "Shall I note that you'd like kids menus and a high chair if needed?",
    });
  }
  if (g >= 8 || input.occasion === "corporate" || input.occasion === "wedding") {
    out.push({
      kind: "buffet_or_private",
      message: "For a larger group, would you like me to mention private dining or buffet options to our team?",
    });
  }
  if (input.occasion === "graduation" || input.occasion === "baby_shower") {
    out.push({
      kind: "decorations",
      message: "Would you like us to note any decorations or a celebration cake request?",
    });
  }

  return out.slice(0, 2);
}

export function shouldRecommendHumanTransfer(input: {
  isVip?: boolean;
  guests?: number;
  occasion: OccasionKind;
  failureCount?: number;
  customerRequestedStaff?: boolean;
  accessibilityNeeds?: boolean;
}): { recommend: boolean; reason: string | null } {
  if (input.customerRequestedStaff) {
    return { recommend: true, reason: "Customer requested to speak with staff." };
  }
  if (input.isVip) {
    return { recommend: true, reason: "VIP guest — staff assistance recommended." };
  }
  if ((input.failureCount ?? 0) >= 2) {
    return { recommend: true, reason: "Repeated reservation failures." };
  }
  if (input.occasion === "corporate" || input.occasion === "wedding") {
    return { recommend: true, reason: "Corporate or wedding event — specialist recommended." };
  }
  if ((input.guests ?? 0) >= 20) {
    return { recommend: true, reason: "Large group / catering scope." };
  }
  if (input.accessibilityNeeds) {
    return { recommend: true, reason: "Special accessibility needs." };
  }
  return { recommend: false, reason: null };
}
