import { createClientIfConfigured } from "../../lib/supabase/client";

export function voiceTable(name: string) {
  const c = createClientIfConfigured();
  if (!c) return null;
  return (
    c as unknown as {
      from: (t: string) => ReturnType<NonNullable<ReturnType<typeof createClientIfConfigured>>["from"]>;
    }
  ).from(name);
}

export function newConversationId(prefix = "voice"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
