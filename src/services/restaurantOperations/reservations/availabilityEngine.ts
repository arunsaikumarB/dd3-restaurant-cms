import { getSettings, listReservationsForDate, listSlots, listTables } from "./reservationRepository";
import type { AvailabilitySlot } from "./types";

export async function getAvailability(input: {
  locationId: string;
  date: string;
  guests?: number;
}): Promise<AvailabilitySlot[]> {
  const [settings, slots, existing, tables] = await Promise.all([
    getSettings(input.locationId),
    listSlots(input.locationId),
    listReservationsForDate(input.locationId, input.date),
    listTables(input.locationId),
  ]);

  if (settings.blockedDates.includes(input.date) || settings.holidayDates.includes(input.date)) {
    return slots.map((time) => ({
      time,
      available: false,
      remainingCovers: 0,
      reason: "Blocked date / holiday",
    }));
  }

  const totalCapacity = tables
    .filter((t) => t.status !== "maintenance")
    .reduce((s, t) => s + t.capacity, 0) || 80;
  const party = input.guests ?? 2;

  return slots.map((time) => {
    const booked = existing
      .filter((r) => r.time === time || overlaps(r.time, time, settings.defaultDurationMinutes, settings.bufferMinutes))
      .reduce((s, r) => s + r.guests, 0);
    const remaining = Math.max(0, totalCapacity - booked);
    const suitableTables = tables.filter(
      (t) =>
        t.active &&
        t.status !== "maintenance" &&
        t.capacity >= party &&
        !existing.some((r) => r.tableId === t.id && r.time === time),
    );
    const available = remaining >= party && suitableTables.length > 0;
    return {
      time,
      available,
      remainingCovers: remaining,
      reason: available ? undefined : remaining < party ? "Over capacity" : "No suitable table",
    };
  });
}

function overlaps(existingTime: string, slot: string, durationMin: number, bufferMin: number): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const a = toMin(existingTime);
  const b = toMin(slot);
  const span = durationMin + bufferMin;
  return Math.abs(a - b) < span;
}

export async function isSlotAvailable(input: {
  locationId: string;
  date: string;
  time: string;
  guests: number;
}): Promise<{ available: boolean; reason?: string }> {
  const slots = await getAvailability(input);
  const match = slots.find((s) => s.time === input.time);
  if (!match) return { available: false, reason: "Invalid time slot" };
  return { available: match.available, reason: match.reason };
}
