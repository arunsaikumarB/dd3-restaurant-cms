import type { ClarificationField, ClarificationPlan, CustomerGoal, PlannerIntent } from "./types";

export function detectClarification(input: {
  message: string;
  intent: PlannerIntent;
  goal: CustomerGoal;
  knownFields?: Partial<Record<ClarificationField, string | number | boolean>>;
  hasLocation?: boolean;
}): ClarificationPlan {
  const q = input.message.toLowerCase();
  const known = input.knownFields ?? {};
  const fields: ClarificationField[] = [];
  const reasons: string[] = [];

  const need = (field: ClarificationField, present: boolean, reason: string) => {
    if (known[field] != null && known[field] !== "") return;
    if (!present) {
      fields.push(field);
      reasons.push(reason);
    }
  };

  const hasDate = /\b(today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}[\/\-]\d{1,2}|\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))\b/i.test(
    q,
  );
  const hasTime = /\b(\d{1,2}(:\d{2})?\s?(am|pm)|noon|midnight|evening|morning|afternoon)\b/i.test(q);
  const hasGuests = /\b(\d+\s*(people|guests?|pax|persons?)|table for\s*\d+|party of\s*\d+)\b/i.test(q);
  const hasPhone = /\b(\+?\d[\d\s\-()]{7,}\d)\b/.test(q);
  const hasName = /\b(my name is|this is [A-Z][a-z]+)\b/.test(input.message);
  const hasPartySize = hasGuests || /\b\d{2,}\s*(people|guests|pax)\b/.test(q);
  const hasEventDate = hasDate;
  const hasDietary = /\b(veg|vegan|spicy|allergy|gluten|nut.?free)\b/.test(q);
  const hasOrderId = /\b(order\s?#?\s*\w{4,}|\b[A-Z0-9]{6,}\b)/.test(input.message);

  if (
    input.intent === "reservation" ||
    input.goal === "book_table" ||
    input.goal === "modify_reservation"
  ) {
    need("location", Boolean(input.hasLocation), "Outlet not confirmed for reservation");
    need("date", hasDate, "Reservation date missing");
    need("time", hasTime, "Reservation time missing");
    need("guests", hasGuests, "Guest count missing");
  }

  if (input.goal === "retrieve_reservation" || input.intent === "cancel_reservation") {
    need("customer_name", hasName, "Name helps look up the reservation");
    need("phone", hasPhone, "Phone helps look up the reservation");
    need("date", hasDate, "Original reservation date missing");
  }

  if (input.intent === "catering" || input.goal === "large_catering" || input.intent === "party_booking") {
    need("location", Boolean(input.hasLocation), "Outlet preferred for catering/party");
    need("party_size", hasPartySize, "Headcount missing for catering/party");
    need("event_date", hasEventDate, "Event date missing");
  }

  if (input.intent === "dish_recommendation") {
    need("dietary", hasDietary, "Dietary preference would improve recommendations");
  }

  if (input.intent === "order_status") {
    need("order_id", hasOrderId, "Order ID missing");
    need("phone", hasPhone, "Phone helps locate the order");
  }

  // Deduplicate while preserving order
  const unique = [...new Set(fields)];
  return {
    required: unique.length > 0,
    fields: unique,
    reason: reasons[0],
  };
}
