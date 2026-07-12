import { createClientIfConfigured } from "../../lib/supabase/client";

export function kiClient() {
  const client = createClientIfConfigured();
  if (!client) throw new Error("Supabase is not configured.");
  return client;
}

export function kiTable(name: string) {
  return (kiClient() as unknown as { from: (t: string) => ReturnType<ReturnType<typeof kiClient>["from"]> }).from(
    name,
  );
}

export async function writeAudit(input: {
  eventType: string;
  summary: string;
  entityType?: string;
  entityId?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { data: userData } = await kiClient().auth.getUser();
    await kiTable("knowledge_audit").insert({
      event_type: input.eventType,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      actor_id: userData.user?.id ?? null,
      summary: input.summary,
      before_state: input.before ?? null,
      after_state: input.after ?? null,
      metadata: input.metadata ?? {},
    });
  } catch {
    /* never block primary flows on audit */
  }
}

export async function listAudit(limit = 80): Promise<
  Array<{
    id: string;
    event_type: string;
    entity_type: string | null;
    entity_id: string | null;
    summary: string;
    created_at: string;
    metadata: Record<string, unknown>;
  }>
> {
  const { data, error } = await kiTable("knowledge_audit")
    .select("id, event_type, entity_type, entity_id, summary, created_at, metadata")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as never;
}
