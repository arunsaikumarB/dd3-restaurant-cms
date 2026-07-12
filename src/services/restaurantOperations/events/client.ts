import { createClientIfConfigured } from "../../../lib/supabase/client";

export function evtTable(name: string) {
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

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10;
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
