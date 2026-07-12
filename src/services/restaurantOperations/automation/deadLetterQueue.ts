import { insertDeadLetter, listDeadLetters, updateDeadLetter, getInstance } from "./repository";
import type { DeadLetterItem } from "./types";

export async function moveToDeadLetter(input: {
  instanceId?: string | null;
  eventId?: string | null;
  locationId?: string | null;
  reason?: string;
  payload?: Record<string, unknown>;
}): Promise<DeadLetterItem | null> {
  return insertDeadLetter(input);
}

export async function getDeadLetterQueue(opts: {
  locationId?: string;
  status?: string;
}): Promise<DeadLetterItem[]> {
  return listDeadLetters({ ...opts, status: opts.status ?? "open" });
}

export async function retryDeadLetter(id: string): Promise<DeadLetterItem | null> {
  const items = await listDeadLetters({});
  const item = items.find((d) => d.id === id);
  if (!item) return null;

  if (item.instanceId) {
    const { retryWorkflow } = await import("./workflowEngine");
    await retryWorkflow(item.instanceId);
  }

  return updateDeadLetter(id, {
    status: "retried",
    retryCount: item.retryCount + 1,
    resolvedAt: new Date().toISOString(),
  });
}

export async function cancelDeadLetter(id: string): Promise<DeadLetterItem | null> {
  return updateDeadLetter(id, {
    status: "cancelled",
    resolvedAt: new Date().toISOString(),
  });
}

export async function auditDeadLetter(id: string): Promise<{
  item: DeadLetterItem | null;
  instance: Awaited<ReturnType<typeof getInstance>>;
}> {
  const items = await listDeadLetters({});
  const item = items.find((d) => d.id === id) ?? null;
  const instance = item?.instanceId ? await getInstance(item.instanceId) : null;
  return { item, instance };
}
