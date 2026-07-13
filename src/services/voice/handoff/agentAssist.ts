/**
 * Silent Agent Assist — suggestions only; AI does not speak unless staff requests.
 */

import type { AgentAssistBundle, TransferContextPayload } from "./types";

export function buildAgentAssist(context: TransferContextPayload): AgentAssistBundle {
  const name = context.customerName ?? "the guest";
  const suggestedResponses = [
    `Hi ${name}, I'm ${context.suggestedNextAction ? "taking over from Cheffy" : "here to help"} — I already have your details.`,
    context.confirmationCode
      ? `I see reservation ${context.confirmationCode}. How can I help from here?`
      : `How can I help you today?`,
    context.specialRequests
      ? `I've noted your request: ${context.specialRequests}.`
      : `Is there anything specific you'd like me to arrange?`,
  ];

  const policyReferences = [
    "Never ask the guest to repeat information already in the transfer context.",
    "VIP and complaint calls: acknowledge first, resolve second.",
    "Refunds require manager or support review before promising amounts.",
  ];

  const ragHints = (context.knowledgeUsed ?? []).slice(0, 5);
  const customerHistory = [
    context.crmProfile?.isVip ? "VIP guest" : null,
    Array.isArray(context.previousVisits) && context.previousVisits.length
      ? `Tags/history: ${context.previousVisits.slice(0, 5).join(", ")}`
      : null,
    context.dietaryPreferences?.length
      ? `Dietary: ${context.dietaryPreferences.join(", ")}`
      : null,
  ].filter(Boolean) as string[];

  const reservationInfo = [
    context.reservationStatus ? `Status: ${context.reservationStatus}` : null,
    context.confirmationCode ? `Code: ${context.confirmationCode}` : null,
    context.specialRequests ? `Requests: ${context.specialRequests}` : null,
  ].filter(Boolean) as string[];

  const currentOffers = [
    "Ask about today's chef specials if dining soon.",
    "Mention private dining for parties of 8+ when relevant.",
  ];

  return {
    suggestedResponses,
    policyReferences,
    ragHints: ragHints.length ? ragHints : ["Use Semantic RAG from admin Knowledge Base if needed."],
    customerHistory,
    reservationInfo,
    currentOffers,
    silent: true,
  };
}
