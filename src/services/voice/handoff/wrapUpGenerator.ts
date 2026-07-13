import type { TaskType, TransferContextPayload, WrapUpResult } from "./types";

export function generateWrapUp(input: {
  outcome: string;
  context: TransferContextPayload;
  agentNotes?: string | null;
  reservationStatus?: string | null;
  sentiment?: string | null;
}): WrapUpResult {
  const sentiment = input.sentiment ?? input.context.sentiment ?? "neutral";
  const reservationResult =
    input.reservationStatus ??
    input.context.reservationStatus ??
    (input.context.confirmationCode ? `Confirmed ${input.context.confirmationCode}` : null);

  const suggestedTasks: TaskType[] = [];
  if (input.outcome === "callback" || !input.context.phone) suggestedTasks.push("callback");
  if (sentiment === "negative") suggestedTasks.push("follow_up", "manager_review");
  if (/\brefund\b/i.test(input.outcome + (input.agentNotes ?? ""))) suggestedTasks.push("refund_review");
  if (/\bcomplaint\b/i.test(input.outcome + (input.agentNotes ?? ""))) suggestedTasks.push("complaint_ticket");
  if (input.context.crmProfile?.isVip) suggestedTasks.push("vip_follow_up");
  if (reservationResult && /confirm|pending|created/i.test(String(reservationResult))) {
    suggestedTasks.push("reservation_confirmation");
  }
  if (!suggestedTasks.length) suggestedTasks.push("follow_up");

  const summary = [
    `Staff handoff outcome: ${input.outcome}.`,
    input.context.customerName ? `Guest: ${input.context.customerName}.` : null,
    input.context.aiSummary ?? null,
    reservationResult ? `Reservation: ${reservationResult}.` : null,
    input.agentNotes ? `Notes: ${input.agentNotes}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    summary,
    outcome: input.outcome,
    reservationResult,
    followUpNeeded: suggestedTasks.includes("follow_up") || suggestedTasks.includes("callback"),
    customerSentiment: sentiment,
    agentNotes: input.agentNotes ?? null,
    suggestedTasks: [...new Set(suggestedTasks)].slice(0, 4),
  };
}
