import { getAvailability, isSlotAvailable, getSettings } from "../../restaurantOperations/reservations";
import type { AvailabilitySlot } from "../../restaurantOperations/reservations/types";

export async function checkLiveAvailability(input: {
  locationId: string;
  date: string;
  time?: string;
  guests?: number;
}): Promise<{
  available: boolean;
  slots: AvailabilitySlot[];
  alternatives: string[];
  reason?: string;
  restaurantOpen: boolean;
}> {
  const settings = await getSettings(input.locationId);
  const blocked =
    settings.blockedDates.includes(input.date) || settings.holidayDates.includes(input.date);
  if (blocked) {
    return {
      available: false,
      slots: [],
      alternatives: [],
      reason: "We're closed or not accepting reservations on that date. Would another day work?",
      restaurantOpen: false,
    };
  }

  const slots = await getAvailability({
    locationId: input.locationId,
    date: input.date,
    guests: input.guests,
  });
  const open = slots.filter((s) => s.available).map((s) => s.time);

  if (input.time) {
    const check = await isSlotAvailable({
      locationId: input.locationId,
      date: input.date,
      time: input.time,
      guests: input.guests ?? 2,
    });
    if (!check.available) {
      return {
        available: false,
        slots,
        alternatives: open.filter((t) => t !== input.time).slice(0, 5),
        reason: check.reason ?? "That time is not available.",
        restaurantOpen: true,
      };
    }
    return { available: true, slots, alternatives: [], restaurantOpen: true };
  }

  return {
    available: open.length > 0,
    slots,
    alternatives: open.slice(0, 8),
    reason: open.length ? undefined : "No tables available that day.",
    restaurantOpen: true,
  };
}
