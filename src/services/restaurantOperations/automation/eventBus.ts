/**
 * Centralized domain event bus.
 * Publishers: tool adapters / soft hooks. Consumer: Workflow Engine only.
 */

import { makeIdempotencyKey } from "./client";
import { insertEvent, listEvents, updateEventStatus } from "./repository";
import type { DomainEvent, PublishEventInput } from "./types";
import { dispatchDomainEvent } from "./workflowEngine";

export async function publishDomainEvent(
  input: PublishEventInput,
): Promise<{ event: DomainEvent | null; duplicate: boolean }> {
  const idempotencyKey =
    input.idempotencyKey ??
    makeIdempotencyKey([
      input.eventType,
      input.entityId,
      input.correlationId,
      input.locationId,
    ]);

  const event = await insertEvent({
    eventType: input.eventType,
    source: input.source,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    locationId: input.locationId ?? null,
    payload: input.payload ?? {},
    version: input.version ?? 1,
    correlationId: input.correlationId ?? null,
    idempotencyKey,
  });

  if (!event) return { event: null, duplicate: false };
  if (event.status === "duplicate") return { event, duplicate: true };

  // Fire-and-forget orchestration — never block the publisher path hard
  try {
    await updateEventStatus(event.id, "processing");
    await dispatchDomainEvent(event);
    await updateEventStatus(event.id, "processed", true);
  } catch (err) {
    await updateEventStatus(event.id, "failed", true);
    console.warn("[workflow.eventBus] dispatch failed", err);
  }

  return { event, duplicate: false };
}

/** Soft publish that never throws into Reservation / Catering / CRM callers. */
export function publishDomainEventSafe(input: PublishEventInput): void {
  void publishDomainEvent(input).catch(() => {
    /* never block domain engines */
  });
}

export async function getRecentDomainEvents(opts: {
  locationId?: string;
  eventType?: string;
  limit?: number;
}): Promise<DomainEvent[]> {
  return listEvents(opts);
}
