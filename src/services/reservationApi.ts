import { SITE } from "../constants/site";
import { isSupabaseConfigured } from "../lib/supabase/env";
import { createPublicReservation } from "./reservations";

export interface ReservationPayload {
  locationId: string;
  date: string;
  time: string;
  guests: number;
  name: string;
  phone: string;
  email: string;
  specialRequests?: string;
}

export interface TimeSlot {
  value: string;
  label: string;
  available: boolean;
}

/** Optional backend endpoint — set when reservation API is available. */
export const RESERVATION_API_URL = "";

/** Parse "11:00 AM – 10:00 PM" into minutes from midnight. */
function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function formatMinutes(minutes: number): { value: string; label: string } {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  const label = `${displayHour}:${m.toString().padStart(2, "0")} ${period}`;
  const value = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  return { value, label };
}

function getHoursForDate(date: Date): { open: number; close: number } | null {
  const day = date.getDay();
  if (day === 0) {
    const row = SITE.hours.find((h) => h.days.includes("Sun"));
    if (!row) return null;
    const [openStr, closeStr] = row.time.split("–").map((s) => s.trim());
    return {
      open: parseTimeToMinutes(openStr),
      close: parseTimeToMinutes(closeStr),
    };
  }
  if (day >= 5) {
    const row = SITE.hours.find((h) => h.days.includes("Fri"));
    if (!row) return null;
    const [openStr, closeStr] = row.time.split("–").map((s) => s.trim());
    return {
      open: parseTimeToMinutes(openStr),
      close: parseTimeToMinutes(closeStr),
    };
  }
  const row = SITE.hours.find((h) => h.days.includes("Mon"));
  if (!row) return null;
  const [openStr, closeStr] = row.time.split("–").map((s) => s.trim());
  return {
    open: parseTimeToMinutes(openStr),
    close: parseTimeToMinutes(closeStr),
  };
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Generate 30-minute reservation slots for the selected date. */
export async function fetchAvailableTimeSlots(
  _locationId: string,
  dateIso: string,
): Promise<TimeSlot[]> {
  const date = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return [];

  const hours = getHoursForDate(date);
  if (!hours) return [];

  const now = new Date();
  const isToday = isSameDay(date, now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const lastSeating = hours.close - 60;
  const slots: TimeSlot[] = [];

  for (let m = hours.open; m <= lastSeating; m += 30) {
    const { value, label } = formatMinutes(m);
    const past = isToday && m <= currentMinutes + 30;
    const unavailable = past || (m % 90 === 0 && m % 180 !== 0);
    slots.push({
      value,
      label,
      available: !unavailable,
    });
  }

  return slots;
}

export async function submitReservation(
  payload: ReservationPayload,
): Promise<{ success: boolean; message: string }> {
  if (RESERVATION_API_URL) {
    const response = await fetch(RESERVATION_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || "Unable to complete your reservation.");
    }

    return {
      success: true,
      message: "Your table has been reserved. We look forward to welcoming you.",
    };
  }

  if (isSupabaseConfigured()) {
    await createPublicReservation({
      customer_name: payload.name.trim(),
      phone: payload.phone.trim(),
      email: payload.email.trim(),
      date: payload.date,
      time: payload.time,
      guests: payload.guests,
      special_request: payload.specialRequests?.trim(),
    });

    return {
      success: true,
      message: `Thank you, ${payload.name.split(" ")[0]}. Your request for ${payload.guests} guest${
        payload.guests > 1 ? "s" : ""
      } on ${payload.date} at ${payload.time} has been received. Our team will confirm shortly.`,
    };
  }

  await new Promise((resolve) => setTimeout(resolve, 900));

  return {
    success: true,
    message: `Thank you, ${payload.name.split(" ")[0]}. Your request for ${payload.guests} guest${
      payload.guests > 1 ? "s" : ""
    } on ${payload.date} at ${payload.time} has been received. Our team will confirm shortly.`,
  };
}
