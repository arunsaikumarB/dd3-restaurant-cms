import { createClientIfConfigured } from "../../../lib/supabase/client";

export function opsTable(name: string) {
  const c = createClientIfConfigured();
  if (!c) return null;
  return (
    c as unknown as {
      from: (t: string) => ReturnType<NonNullable<ReturnType<typeof createClientIfConfigured>>["from"]>;
    }
  ).from(name);
}

export function countBy<T extends string>(items: T[]): Array<{ label: string; value: number }> {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = item || "unknown";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return Number((nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(2));
}

export function pct(part: number, total: number): number {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

export function dayLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}
