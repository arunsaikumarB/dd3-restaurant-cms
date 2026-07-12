import type { ClarificationField } from "../planner/types";
import type { AgentExecutionPlan } from "../planner/types";

const FIELD_PROMPTS: Record<string, string> = {
  location: "Which Desi Dhamaka location would you like?",
  date: "When would you like to visit?",
  time: "What time works best for you?",
  guests: "How many guests will be joining?",
  customer_name: "May I have a name for the booking?",
  phone: "What's the best phone number to reach you?",
  party_size: "About how many guests are you planning for?",
  event_date: "What date is the event?",
  budget: "Do you have a budget range in mind?",
  dietary: "Any dietary preferences I should know about?",
  order_id: "Do you have an order number handy?",
};

/** Natural follow-up questions — never expose raw field names to guests. */
export function buildClarificationQuestion(
  missing: ClarificationField[],
  plan?: AgentExecutionPlan | null,
  history: Array<{ role: string; content: string }> = [],
): string | null {
  const unanswered = missing.filter((field) => !alreadyAnswered(field, history));
  if (!unanswered.length) return null;

  const primary = unanswered[0]!;
  if (unanswered.length === 1) {
    return FIELD_PROMPTS[primary] ?? "Could you share a bit more detail so I can help accurately?";
  }

  if (plan?.goal === "book_table" || plan?.intent === "reservation") {
    const labels = unanswered.slice(0, 3).map(humanLabel);
    return `To hold a table, I'll need your ${joinNatural(labels)}. ${FIELD_PROMPTS[primary]}`;
  }

  if (plan?.goal === "large_catering" || plan?.intent === "catering") {
    return `For catering, could you share ${joinNatural(unanswered.slice(0, 3).map(humanLabel))}? ${FIELD_PROMPTS[primary]}`;
  }

  return `${FIELD_PROMPTS[primary]} If you can also share ${joinNatural(unanswered.slice(1, 3).map(humanLabel))}, I can finish this for you.`;
}

function alreadyAnswered(field: ClarificationField, history: Array<{ role: string; content: string }>): boolean {
  const userTexts = history.filter((h) => h.role === "user").map((h) => h.content.toLowerCase()).join(" ");
  if (!userTexts) return false;
  switch (field) {
    case "date":
      return /\b(today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}[\/\-]\d{1,2})\b/.test(userTexts);
    case "time":
      return /\b(\d{1,2}(:\d{2})?\s?(am|pm)|noon|evening|morning)\b/.test(userTexts);
    case "guests":
    case "party_size":
      return /\b\d+\s*(people|guests?|pax)\b|table for\s*\d+/.test(userTexts);
    case "phone":
      return /\+?\d[\d\s\-()]{7,}\d/.test(userTexts);
    case "dietary":
      return /\b(veg|vegan|spicy|allergy|gluten)\b/.test(userTexts);
    default:
      return false;
  }
}

function humanLabel(field: ClarificationField): string {
  switch (field) {
    case "customer_name":
      return "name";
    case "party_size":
      return "guest count";
    case "event_date":
      return "event date";
    case "order_id":
      return "order number";
    default:
      return String(field).replace(/_/g, " ");
  }
}

function joinNatural(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}
