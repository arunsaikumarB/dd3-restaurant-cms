import { createClientIfConfigured } from "../../../lib/supabase/client";

export function resTable(name: string) {
  const c = createClientIfConfigured();
  if (!c) return null;
  return (
    c as unknown as {
      from: (t: string) => ReturnType<NonNullable<ReturnType<typeof createClientIfConfigured>>["from"]>;
    }
  ).from(name);
}

export function makeConfirmationCode(): string {
  const part = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `DD-${part}`;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "").trim();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10;
}
