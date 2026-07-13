import type { VoiceReservationCall } from "./types";

export type VoiceCallOutcomePayload = {
  reservation_outcome: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  reservation_id: string | null;
  confirmation_code: string | null;
  conversation_summary: string | null;
  planner_goal?: string | null;
  reflection_score?: number | null;
  confidence?: number | null;
  escalation_recommend: boolean;
  escalation_reason: string | null;
};

export function buildCallOutcome(input: {
  call: VoiceReservationCall;
  reflectionScore?: number | null;
  confidence?: number | null;
  escalationRecommend?: boolean;
  escalationReason?: string | null;
  conversationSummary?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  plannerGoal?: string | null;
}): VoiceCallOutcomePayload {
  const c = input.call;
  return {
    reservation_outcome: c.outcome ?? c.stage,
    customer_name: input.customerName ?? c.collected.customerName ?? null,
    customer_phone: input.customerPhone ?? c.collected.phone ?? null,
    reservation_id: c.reservationId,
    confirmation_code: c.confirmationCode,
    conversation_summary: input.conversationSummary ?? null,
    planner_goal: input.plannerGoal ?? null,
    reflection_score: input.reflectionScore ?? null,
    confidence: input.confidence ?? null,
    escalation_recommend: input.escalationRecommend ?? c.transferRecommended,
    escalation_reason: input.escalationReason ?? c.transferReason,
  };
}

export function buildConversationSummary(input: {
  workflow: string;
  status: string;
  collected: Record<string, unknown>;
  confirmationCode?: string | null;
  turns?: number;
}): string {
  const c = input.collected;
  return [
    `Voice reservation ${input.workflow} ended as ${input.status}.`,
    typeof c.customerName === "string" ? `Guest: ${c.customerName}.` : null,
    typeof c.date === "string" && typeof c.time === "string" ? `Slot: ${c.date} ${c.time}.` : null,
    typeof c.guests === "number" ? `Party of ${c.guests}.` : null,
    input.confirmationCode ? `Confirmation: ${input.confirmationCode}.` : null,
    input.turns != null ? `Turns: ${input.turns}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}
