/**
 * Domain event publishers for tool adapters.
 * Does not modify Reservation Engine / Event Engine / CRM internals —
 * called after successful tool results only.
 */

import { publishDomainEventSafe } from "./eventBus";

export function publishReservationDomainEvents(input: {
  locationId: string;
  action: string;
  ok: boolean;
  reservation?: {
    id?: string;
    customerName?: string | null;
    phone?: string | null;
    email?: string | null;
    guests?: number | null;
    occasion?: string | null;
    status?: string | null;
    date?: string | null;
    time?: string | null;
  } | null;
  conversationId?: string | null;
}): void {
  if (!input.ok || !input.reservation?.id) return;

  const payload = {
    customerName: input.reservation.customerName,
    phone: input.reservation.phone,
    email: input.reservation.email,
    guests: input.reservation.guests,
    occasion: input.reservation.occasion,
    status: input.reservation.status,
    date: input.reservation.date,
    time: input.reservation.time,
    vip: false,
  };

  const action = input.action.toLowerCase();
  let eventType = "ReservationCreated";
  if (action === "cancel") eventType = "ReservationCancelled";
  else if (action === "modify" || action === "reschedule") eventType = "ReservationModified";
  else if (action === "confirm") eventType = "ReservationCheckedIn";
  else if (action === "create") eventType = "ReservationCreated";

  publishDomainEventSafe({
    eventType,
    source: "reservations",
    entityType: "reservation",
    entityId: input.reservation.id,
    locationId: input.locationId,
    correlationId: input.conversationId ?? input.reservation.id,
    payload,
  });
}

export function publishCateringDomainEvents(input: {
  locationId: string;
  action: string;
  ok: boolean;
  lead?: { id?: string; status?: string; customerName?: string | null; phone?: string | null } | null;
  event?: {
    id?: string;
    workflowStage?: string;
    eventType?: string | null;
    guestCount?: number | null;
    customerId?: string | null;
  } | null;
  quote?: { id?: string; approvalStatus?: string; grandTotal?: number } | null;
  conversationId?: string | null;
}): void {
  if (!input.ok) return;

  const base = {
    locationId: input.locationId,
    correlationId: input.conversationId ?? input.event?.id ?? input.lead?.id ?? null,
    payload: {
      leadId: input.lead?.id,
      eventId: input.event?.id,
      quoteId: input.quote?.id,
      customerName: input.lead?.customerName,
      phone: input.lead?.phone,
      guestCount: input.event?.guestCount,
      eventType: input.event?.eventType,
      stage: input.event?.workflowStage,
      quoteStatus: input.quote?.approvalStatus,
      grandTotal: input.quote?.grandTotal,
    },
  };

  const action = input.action.toLowerCase();
  const stage = input.event?.workflowStage ?? "";

  if (action === "inquire" || action === "qualify") {
    if (input.lead?.id && (action === "qualify" || input.lead.status === "qualified")) {
      publishDomainEventSafe({
        ...base,
        eventType: "LeadQualified",
        source: "catering",
        entityType: "event_lead",
        entityId: input.lead.id,
      });
    }
  }

  if (action === "quote" || action === "revise") {
    publishDomainEventSafe({
      ...base,
      eventType: "ProposalGenerated",
      source: "catering",
      entityType: "event",
      entityId: input.event?.id ?? input.quote?.id ?? null,
    });
  }

  if (
    action === "approve" ||
    input.quote?.approvalStatus === "approved" ||
    input.quote?.approvalStatus === "accepted"
  ) {
    publishDomainEventSafe({
      ...base,
      eventType: "QuoteApproved",
      source: "catering",
      entityType: "event_quote",
      entityId: input.quote?.id ?? input.event?.id ?? null,
    });
  }

  if (
    action === "book" ||
    stage === "confirmed" ||
    stage === "deposit_received" ||
    stage === "deposit_pending"
  ) {
    if (stage === "confirmed" || stage === "deposit_received" || action === "book") {
      publishDomainEventSafe({
        ...base,
        eventType: "EventConfirmed",
        source: "catering",
        entityType: "event",
        entityId: input.event?.id ?? null,
      });
    }
  }
}
