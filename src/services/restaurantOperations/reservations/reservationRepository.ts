import { resTable } from "./client";
import type { ReservationRecord, ReservationSettings, RestaurantTable } from "./types";

export function mapReservationRow(row: Record<string, unknown>): ReservationRecord {
  return {
    id: String(row.id),
    locationId: String(row.location_id),
    customerName: String(row.customer_name),
    phone: String(row.phone),
    email: (row.email as string | null) ?? null,
    date: String(row.date),
    time: String(row.time).slice(0, 5),
    guests: Number(row.guests),
    status: (row.status as ReservationRecord["status"]) ?? "pending",
    specialRequest: (row.special_request as string | null) ?? null,
    confirmationCode: (row.confirmation_code as string | null) ?? null,
    occasion: (row.occasion as string | null) ?? null,
    tableId: (row.table_id as string | null) ?? null,
    source: (row.source as string | null) ?? "website",
    highChair: Boolean(row.high_chair),
    outdoorRequested: row.outdoor_requested as boolean | null,
    boothRequested: row.booth_requested as boolean | null,
    windowRequested: row.window_requested as boolean | null,
    dietaryRestrictions: (row.dietary_restrictions as string[]) ?? [],
    childrenCount: Number(row.children_count ?? 0),
    noShow: Boolean(row.no_show),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export function mapTableRow(row: Record<string, unknown>): RestaurantTable {
  return {
    id: String(row.id),
    locationId: String(row.location_id),
    tableNumber: String(row.table_number),
    capacity: Number(row.capacity),
    indoor: Boolean(row.indoor),
    outdoor: Boolean(row.outdoor),
    booth: Boolean(row.booth),
    windowSeat: Boolean(row.window_seat),
    vip: Boolean(row.vip),
    privateRoom: Boolean(row.private_room),
    status: (row.status as RestaurantTable["status"]) ?? "available",
    posX: Number(row.pos_x ?? 0),
    posY: Number(row.pos_y ?? 0),
    active: row.active !== false,
  };
}

export async function getSettings(locationId: string): Promise<ReservationSettings> {
  const defaults: ReservationSettings = {
    locationId,
    defaultDurationMinutes: 90,
    bufferMinutes: 15,
    maxGuests: 12,
    minGuests: 1,
    advanceBookingDays: 60,
    sameDayCutoffTime: null,
    depositRequired: false,
    allowWaitlist: true,
    peakHours: ["18:00", "18:30", "19:00", "19:30", "20:00"],
    holidayDates: [],
    blockedDates: [],
  };
  try {
    const t = resTable("reservation_settings");
    if (!t) return defaults;
    const { data } = await t.select("*").eq("location_id", locationId).maybeSingle();
    if (!data) return defaults;
    const row = data as Record<string, unknown>;
    return {
      locationId,
      defaultDurationMinutes: Number(row.default_duration_minutes ?? 90),
      bufferMinutes: Number(row.buffer_minutes ?? 15),
      maxGuests: Number(row.max_guests ?? 12),
      minGuests: Number(row.min_guests ?? 1),
      advanceBookingDays: Number(row.advance_booking_days ?? 60),
      sameDayCutoffTime: row.same_day_cutoff_time ? String(row.same_day_cutoff_time).slice(0, 5) : null,
      depositRequired: Boolean(row.deposit_required),
      allowWaitlist: row.allow_waitlist !== false,
      peakHours: Array.isArray(row.peak_hours) ? (row.peak_hours as string[]) : defaults.peakHours,
      holidayDates: (row.holiday_dates as string[]) ?? [],
      blockedDates: (row.blocked_dates as string[]) ?? [],
    };
  } catch {
    return defaults;
  }
}

export async function listTables(locationId: string): Promise<RestaurantTable[]> {
  try {
    const t = resTable("restaurant_tables");
    if (!t) return [];
    const { data } = await t
      .select("*")
      .eq("location_id", locationId)
      .eq("active", true)
      .order("table_number");
    return ((data ?? []) as Record<string, unknown>[]).map(mapTableRow);
  } catch {
    return [];
  }
}

export async function listReservationsForDate(
  locationId: string,
  date: string,
): Promise<ReservationRecord[]> {
  try {
    const t = resTable("reservations");
    if (!t) return [];
    const { data } = await t
      .select("*")
      .eq("location_id", locationId)
      .eq("date", date)
      .neq("status", "cancelled")
      .order("time");
    return ((data ?? []) as Record<string, unknown>[]).map(mapReservationRow);
  } catch {
    return [];
  }
}

export async function listSlots(locationId: string): Promise<string[]> {
  try {
    const t = resTable("reservation_slots");
    if (!t) return defaultSlots();
    const { data } = await t.select("slot_time, active").eq("location_id", locationId).eq("active", true);
    const times = ((data ?? []) as Array<{ slot_time: string }>).map((r) => String(r.slot_time).slice(0, 5));
    return times.length ? [...new Set(times)].sort() : defaultSlots();
  } catch {
    return defaultSlots();
  }
}

function defaultSlots(): string[] {
  return [
    "11:30", "12:00", "12:30", "13:00", "13:30",
    "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00",
  ];
}

export async function findReservation(input: {
  id?: string;
  confirmationCode?: string;
  phone?: string;
  locationId?: string;
}): Promise<ReservationRecord | null> {
  try {
    const t = resTable("reservations");
    if (!t) return null;
    if (input.id) {
      const { data } = await t.select("*").eq("id", input.id).maybeSingle();
      return data ? mapReservationRow(data as Record<string, unknown>) : null;
    }
    if (input.confirmationCode) {
      const { data } = await t
        .select("*")
        .eq("confirmation_code", input.confirmationCode.toUpperCase())
        .maybeSingle();
      return data ? mapReservationRow(data as Record<string, unknown>) : null;
    }
    if (input.phone && input.locationId) {
      const { data } = await t
        .select("*")
        .eq("location_id", input.locationId)
        .eq("phone", input.phone)
        .neq("status", "cancelled")
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ? mapReservationRow(data as Record<string, unknown>) : null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function insertReservationEvent(
  reservationId: string | null,
  locationId: string | null,
  eventType: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  try {
    const t = resTable("reservation_events");
    if (!t) return;
    await t.insert({
      reservation_id: reservationId,
      location_id: locationId,
      event_type: eventType,
      actor: "system",
      payload,
    });
  } catch {
    /* never block */
  }
}

export async function upsertGuestProfile(input: {
  locationId: string;
  phone: string;
  email?: string | null;
  fullName: string;
  dietary?: string[];
}): Promise<string | null> {
  try {
    const t = resTable("reservation_guests");
    if (!t) return null;
    const phone = input.phone.trim();
    const { data: existing } = await t
      .select("id, visit_count")
      .eq("location_id", input.locationId)
      .eq("phone", phone)
      .maybeSingle();
    if (existing) {
      const row = existing as { id: string; visit_count: number };
      await t
        .update({
          full_name: input.fullName,
          email: input.email ?? null,
          visit_count: Number(row.visit_count ?? 0) + 1,
          last_visit: new Date().toISOString().slice(0, 10),
          dietary_preferences: input.dietary ?? [],
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      return row.id;
    }
    const { data } = await t
      .insert({
        location_id: input.locationId,
        phone,
        email: input.email ?? null,
        full_name: input.fullName,
        visit_count: 1,
        last_visit: new Date().toISOString().slice(0, 10),
        dietary_preferences: input.dietary ?? [],
      })
      .select("id")
      .single();
    return data ? String((data as { id: string }).id) : null;
  } catch {
    return null;
  }
}

export async function updateTablePositions(
  updates: Array<{ id: string; posX: number; posY: number }>,
): Promise<void> {
  const t = resTable("restaurant_tables");
  if (!t) return;
  for (const u of updates) {
    await t.update({ pos_x: u.posX, pos_y: u.posY, updated_at: new Date().toISOString() }).eq("id", u.id);
  }
}
