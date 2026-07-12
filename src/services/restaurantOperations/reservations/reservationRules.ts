import { getSettings } from "./reservationRepository";
import { resTable } from "./client";
import type { ReservationGuestInput, ReservationSettings } from "./types";

export type RuleValidation = {
  ok: boolean;
  errors: string[];
  settings: ReservationSettings;
};

export async function validateAgainstRules(
  locationId: string,
  input: ReservationGuestInput,
): Promise<RuleValidation> {
  const settings = await getSettings(locationId);
  const errors: string[] = [];

  if (input.guests != null) {
    if (input.guests < settings.minGuests) errors.push(`Minimum party size is ${settings.minGuests}.`);
    if (input.guests > settings.maxGuests) {
      errors.push(`Maximum party size is ${settings.maxGuests}. For larger groups, ask for catering / private dining.`);
    }
  }

  if (input.date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${input.date}T00:00:00`);
    if (Number.isNaN(target.getTime())) errors.push("Invalid reservation date.");
    else {
      if (target < today) errors.push("Date cannot be in the past.");
      const max = new Date(today);
      max.setDate(max.getDate() + settings.advanceBookingDays);
      if (target > max) errors.push(`Bookings are limited to ${settings.advanceBookingDays} days in advance.`);
      if (settings.blockedDates.includes(input.date) || settings.holidayDates.includes(input.date)) {
        errors.push("This date is unavailable due to a holiday or special event.");
      }
    }

    if (input.date === new Date().toISOString().slice(0, 10) && settings.sameDayCutoffTime && input.time) {
      if (input.time < settings.sameDayCutoffTime) {
        /* ok */
      } else {
        const now = new Date();
        const cutoff = settings.sameDayCutoffTime;
        const [h, m] = cutoff.split(":").map(Number);
        if (now.getHours() > (h ?? 0) || (now.getHours() === (h ?? 0) && now.getMinutes() > (m ?? 0))) {
          errors.push("Same-day booking cutoff has passed for this outlet.");
        }
      }
    }
  }

  if (input.email && input.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.push("Please provide a valid email address.");
  }
  if (input.phone && input.phone.replace(/\D/g, "").length < 10) {
    errors.push("Please provide a valid phone number.");
  }

  return { ok: errors.length === 0, errors, settings };
}

export async function listRules(locationId: string): Promise<Array<{ key: string; value: unknown; enabled: boolean }>> {
  try {
    const t = resTable("reservation_rules");
    if (!t) return [];
    const { data } = await t.select("rule_key, rule_value, enabled").eq("location_id", locationId);
    return ((data ?? []) as Array<{ rule_key: string; rule_value: unknown; enabled: boolean }>).map((r) => ({
      key: r.rule_key,
      value: r.rule_value,
      enabled: r.enabled,
    }));
  } catch {
    return [];
  }
}

export async function upsertRule(
  locationId: string,
  ruleKey: string,
  ruleValue: unknown,
  enabled = true,
): Promise<void> {
  const t = resTable("reservation_rules");
  if (!t) return;
  await t.upsert(
    {
      location_id: locationId,
      rule_key: ruleKey,
      rule_value: ruleValue,
      enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "location_id,rule_key" },
  );
}

export async function saveSettings(locationId: string, patch: Partial<ReservationSettings>): Promise<void> {
  const t = resTable("reservation_settings");
  if (!t) return;
  await t.upsert(
    {
      location_id: locationId,
      default_duration_minutes: patch.defaultDurationMinutes,
      buffer_minutes: patch.bufferMinutes,
      max_guests: patch.maxGuests,
      min_guests: patch.minGuests,
      advance_booking_days: patch.advanceBookingDays,
      same_day_cutoff_time: patch.sameDayCutoffTime,
      deposit_required: patch.depositRequired,
      allow_waitlist: patch.allowWaitlist,
      peak_hours: patch.peakHours,
      holiday_dates: patch.holidayDates,
      blocked_dates: patch.blockedDates,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "location_id" },
  );
}
