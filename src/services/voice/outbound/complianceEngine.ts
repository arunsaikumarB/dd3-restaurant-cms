import { getCompliance, isOptedOut } from "./repository";
import type { OutboundCompliance } from "./types";

function parseHm(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function localMinutesNow(timezone: string): { minutes: number; dateIso: string } {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
    const minutes = Number(parts.hour) * 60 + Number(parts.minute);
    const dateIso = `${parts.year}-${parts.month}-${parts.day}`;
    return { minutes, dateIso };
  } catch {
    const d = new Date();
    return {
      minutes: d.getHours() * 60 + d.getMinutes(),
      dateIso: d.toISOString().slice(0, 10),
    };
  }
}

function inWindow(nowMin: number, start: string, end: string): boolean {
  const s = parseHm(start);
  const e = parseHm(end);
  if (s <= e) return nowMin >= s && nowMin < e;
  return nowMin >= s || nowMin < e;
}

export type ComplianceResult = {
  allowed: boolean;
  reason: string | null;
  compliance: OutboundCompliance;
};

/**
 * Consent, opt-out, quiet hours, holidays, calling windows — before any dial.
 */
export async function validateOutboundCompliance(input: {
  locationId: string;
  phone: string;
  hasMarketingConsent?: boolean;
}): Promise<ComplianceResult> {
  const compliance = (await getCompliance(input.locationId))!;

  if (await isOptedOut(input.phone)) {
    return { allowed: false, reason: "Phone is on the Do Not Call / opt-out list.", compliance };
  }

  if (compliance.requireConsent && input.hasMarketingConsent === false) {
    return { allowed: false, reason: "Customer has not consented to outbound calls.", compliance };
  }

  const { minutes, dateIso } = localMinutesNow(compliance.timezone);

  if (compliance.holidayDates.includes(dateIso)) {
    return { allowed: false, reason: "Holiday — outbound calling paused.", compliance };
  }

  if (inWindow(minutes, compliance.quietHoursStart, compliance.quietHoursEnd)) {
    return { allowed: false, reason: "Quiet hours — call deferred.", compliance };
  }

  if (!inWindow(minutes, compliance.callingHoursStart, compliance.callingHoursEnd)) {
    return { allowed: false, reason: "Outside allowed calling hours.", compliance };
  }

  return { allowed: true, reason: null, compliance };
}

export function nextBusinessSlot(_compliance: OutboundCompliance, from = new Date()): Date {
  const candidate = new Date(from.getTime() + 60 * 60 * 1000);
  // Simple deferral: push 1 hour; scheduler re-validates at run time
  return candidate;
}
