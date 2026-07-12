import { createClientIfConfigured } from "../../../lib/supabase/client";

export function journeyTable(name: string) {
  const c = createClientIfConfigured();
  if (!c) return null;
  return (
    c as unknown as {
      from: (t: string) => ReturnType<NonNullable<ReturnType<typeof createClientIfConfigured>>["from"]>;
    }
  ).from(name);
}

export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n * 10) / 10));
}

export function daysBetween(from: Date, to = new Date()): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}
