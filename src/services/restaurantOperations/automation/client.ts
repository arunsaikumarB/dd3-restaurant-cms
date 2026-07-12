import { createClientIfConfigured } from "../../../lib/supabase/client";

export function wfTable(name: string) {
  const c = createClientIfConfigured();
  if (!c) return null;
  return (
    c as unknown as {
      from: (t: string) => ReturnType<NonNullable<ReturnType<typeof createClientIfConfigured>>["from"]>;
    }
  ).from(name);
}

export function makeIdempotencyKey(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(":");
}
