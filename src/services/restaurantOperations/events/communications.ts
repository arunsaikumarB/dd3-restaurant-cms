/**
 * Event communications log — AI, email, proposals, phone notes.
 */

import { insertCommunication, listCommunications } from "./repository";
import type { EventCommunication } from "./types";

export async function logEventCommunication(input: {
  eventId?: string | null;
  leadId?: string | null;
  locationId?: string | null;
  channel: string;
  direction?: string;
  subject?: string | null;
  body?: string | null;
  summary?: string | null;
  conversationId?: string | null;
}): Promise<EventCommunication | null> {
  return insertCommunication(input);
}

export async function getEventCommunications(opts: {
  eventId?: string;
  leadId?: string;
  locationId?: string;
}): Promise<EventCommunication[]> {
  return listCommunications(opts);
}

export async function logAiConversation(input: {
  locationId: string;
  leadId?: string | null;
  eventId?: string | null;
  conversationId?: string | null;
  summary: string;
  body?: string;
}): Promise<EventCommunication | null> {
  return insertCommunication({
    locationId: input.locationId,
    leadId: input.leadId ?? null,
    eventId: input.eventId ?? null,
    conversationId: input.conversationId ?? null,
    channel: "ai_chat",
    direction: "inbound",
    subject: "AI catering conversation",
    summary: input.summary,
    body: input.body ?? null,
  });
}

export async function logProposalSent(input: {
  locationId: string;
  eventId: string;
  leadId?: string | null;
  summary?: string;
}): Promise<EventCommunication | null> {
  return insertCommunication({
    locationId: input.locationId,
    eventId: input.eventId,
    leadId: input.leadId ?? null,
    channel: "email",
    direction: "outbound",
    subject: "Proposal / quotation sent",
    summary: input.summary ?? "Proposal sent to customer",
  });
}
