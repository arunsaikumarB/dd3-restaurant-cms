import { createClientIfConfigured } from "../../../lib/supabase/client";

export function crmTable(name: string) {
  const c = createClientIfConfigured();
  if (!c) return null;
  return (
    c as unknown as {
      from: (t: string) => ReturnType<NonNullable<ReturnType<typeof createClientIfConfigured>>["from"]>;
    }
  ).from(name);
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "").trim();
}

export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "Guest", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

export function displayName(c: { firstName: string; lastName: string; preferredName?: string | null }): string {
  if (c.preferredName?.trim()) return c.preferredName.trim();
  return [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || "Guest";
}

export function monthDayMatches(isoDate: string | null | undefined, today = new Date()): boolean {
  if (!isoDate) return false;
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}

export function withinDays(isoDate: string | null | undefined, days: number, today = new Date()): boolean {
  if (!isoDate) return false;
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  const diff = (thisYear.getTime() - today.getTime()) / 86400000;
  return diff >= 0 && diff <= days;
}
