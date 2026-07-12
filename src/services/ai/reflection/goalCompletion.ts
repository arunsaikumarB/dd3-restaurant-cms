import type { AgentExecutionPlan, ClarificationField } from "../planner/types";
import type { GoalProgressSnapshot } from "./types";

export function evaluateGoalProgress(
  plan?: AgentExecutionPlan | null,
  history: Array<{ role: string; content: string }> = [],
): GoalProgressSnapshot {
  const goal = plan?.goal ?? "unclear";
  const required = plan?.clarification.fields ?? [];
  if (!required.length) {
    return {
      goal,
      progressPercent: 100,
      completedFields: [],
      missingFields: [],
      status: plan?.humanEscalation ? "escalated" : "completed",
    };
  }

  const userBlob = history.filter((h) => h.role === "user").map((h) => h.content).join("\n");
  const completed: ClarificationField[] = [];
  const missing: ClarificationField[] = [];

  for (const field of required) {
    if (fieldPresent(field, userBlob)) completed.push(field);
    else missing.push(field);
  }

  const progressPercent = Math.round((completed.length / required.length) * 100);
  return {
    goal,
    progressPercent,
    completedFields: completed,
    missingFields: missing,
    status: plan?.humanEscalation
      ? "escalated"
      : progressPercent >= 100
        ? "completed"
        : missing.length
          ? "active"
          : "completed",
  };
}

function fieldPresent(field: ClarificationField, text: string): boolean {
  const q = text.toLowerCase();
  switch (field) {
    case "date":
    case "event_date":
      return /\b(today|tonight|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}[\/\-]\d{1,2})\b/i.test(q);
    case "time":
      return /\b(\d{1,2}(:\d{2})?\s?(am|pm)|noon|evening|morning|afternoon)\b/i.test(q);
    case "guests":
    case "party_size":
      return /\b\d+\s*(people|guests?|pax|persons?)|table for\s*\d+|party of\s*\d+/i.test(q);
    case "phone":
      return /\+?\d[\d\s\-()]{7,}\d/.test(q);
    case "customer_name":
      return /\b(my name is|this is [a-z]+)\b/i.test(text);
    case "dietary":
      return /\b(veg|vegan|spicy|allergy|gluten|nut)\b/i.test(q);
    case "location":
      return /\b(oak.?tree|old bridge|lawrence|plainfield|location)\b/i.test(q);
    case "budget":
      return /\$|\bbudget\b|\bper (person|plate)\b/i.test(q);
    case "order_id":
      return /\border\s?#?\s*\w{4,}/i.test(q);
    default:
      return false;
  }
}
