import { listTranscripts, listEvents, getSession } from "../repository";
import { getActiveReservationCall } from "../reservation/repository";
import { findCustomerByIdentity } from "../../restaurantOperations/crm";
import type { TransferContextPayload } from "./types";

/**
 * Builds complete transfer context so staff never ask guests to repeat.
 */
export async function buildTransferContext(input: {
  sessionId: string;
  locationId: string;
  plannerGoal?: string | null;
  customerName?: string | null;
  phone?: string | null;
  language?: string | null;
  suggestedAction?: string | null;
  sentiment?: string | null;
  reflectionConfidence?: number | null;
  knowledgeUsed?: string[];
}): Promise<TransferContextPayload> {
  const [session, transcripts, events, reservationCall] = await Promise.all([
    getSession(input.sessionId),
    listTranscripts(input.sessionId),
    listEvents(input.sessionId, 100),
    getActiveReservationCall(input.sessionId),
  ]);

  const phone =
    input.phone ??
    (typeof session?.metadata?.callerPhone === "string" ? session.metadata.callerPhone : null) ??
    (typeof session?.metadata?.phone === "string" ? session.metadata.phone : null) ??
    reservationCall?.collected.phone ??
    null;

  let crmProfile: Record<string, unknown> = {};
  let previousVisits: unknown[] = [];
  let dietaryPreferences: string[] = [];

  if (phone) {
    try {
      const customer = await findCustomerByIdentity({ locationId: input.locationId, phone });
      if (customer) {
        crmProfile = {
          id: customer.id,
          name: `${customer.firstName} ${customer.lastName}`.trim(),
          phone: customer.phone,
          email: customer.email,
          isVip: customer.isVip,
          status: customer.status,
          visitCount: customer.visitCount,
          lastVisit: customer.lastVisit,
        };
        previousVisits = customer.lastVisit ? [customer.lastVisit] : [];
        dietaryPreferences = [];
      }
    } catch {
      /* CRM optional */
    }
  }

  const timeline = transcripts.slice(-40).map((t) => ({
    role: t.role,
    text: t.text,
    at: t.createdAt,
  }));

  const knowledgeUsed =
    input.knowledgeUsed ??
    events
      .filter((e) => e.eventType.includes("rag") || e.eventType === "assistant_reply")
      .slice(0, 8)
      .map((e) => e.eventType);

  const aiSummary = [
    reservationCall
      ? `Reservation workflow ${reservationCall.workflow} at stage ${reservationCall.stage}.`
      : null,
    reservationCall?.confirmationCode
      ? `Confirmation ${reservationCall.confirmationCode}.`
      : null,
    input.plannerGoal ? `Planner goal: ${input.plannerGoal}.` : null,
    input.suggestedAction ? `Suggested action: ${input.suggestedAction}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    customerName:
      input.customerName ??
      reservationCall?.collected.customerName ??
      (typeof crmProfile.name === "string" ? crmProfile.name : null),
    phone,
    language: input.language ?? session?.language ?? "en",
    currentGoal: reservationCall ? `reservation_${reservationCall.workflow}` : session?.currentIntent,
    plannerGoal: input.plannerGoal ?? session?.plannerGoal ?? null,
    plannerOutput: session?.plannerGoal ?? null,
    conversationTimeline: timeline,
    reservationStatus: reservationCall?.stage ?? reservationCall?.outcome ?? null,
    confirmationCode: reservationCall?.confirmationCode ?? null,
    crmProfile,
    previousVisits,
    dietaryPreferences:
      dietaryPreferences.length > 0
        ? dietaryPreferences
        : reservationCall?.collected.dietaryRestrictions ?? [],
    specialRequests: reservationCall?.collected.specialRequests ?? null,
    aiSummary: aiSummary || "Guest requested staff assistance.",
    suggestedNextAction: input.suggestedAction ?? "Continue from AI summary without re-asking basics.",
    sentiment: input.sentiment ?? null,
    reflectionConfidence: input.reflectionConfidence ?? null,
    knowledgeUsed,
  };
}
