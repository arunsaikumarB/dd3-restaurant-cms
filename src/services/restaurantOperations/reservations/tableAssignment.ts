import { resTable } from "./client";
import { listReservationsForDate, listTables } from "./reservationRepository";
import type { RestaurantTable, SeatingPreference } from "./types";

export async function findBestTable(input: {
  locationId: string;
  date: string;
  time: string;
  guests: number;
  preference?: SeatingPreference;
}): Promise<RestaurantTable | null> {
  const [tables, existing] = await Promise.all([
    listTables(input.locationId),
    listReservationsForDate(input.locationId, input.date),
  ]);

  const taken = new Set(
    existing.filter((r) => r.time === input.time && r.tableId).map((r) => r.tableId as string),
  );

  let candidates = tables.filter(
    (t) =>
      t.active &&
      t.status !== "maintenance" &&
      t.status !== "cleaning" &&
      t.capacity >= input.guests &&
      !taken.has(t.id),
  );

  const pref = input.preference ?? "any";
  if (pref === "outdoor") candidates = candidates.filter((t) => t.outdoor);
  if (pref === "indoor") candidates = candidates.filter((t) => t.indoor);
  if (pref === "booth") candidates = candidates.filter((t) => t.booth);
  if (pref === "window") candidates = candidates.filter((t) => t.windowSeat);
  if (pref === "vip") candidates = candidates.filter((t) => t.vip);
  if (pref === "private") candidates = candidates.filter((t) => t.privateRoom);

  if (!candidates.length) {
    candidates = tables.filter(
      (t) => t.active && t.capacity >= input.guests && !taken.has(t.id) && t.status !== "maintenance",
    );
  }

  candidates.sort((a, b) => a.capacity - b.capacity || a.tableNumber.localeCompare(b.tableNumber));
  return candidates[0] ?? null;
}

export async function assignTable(reservationId: string, tableId: string): Promise<boolean> {
  try {
    const assign = resTable("table_assignments");
    const reservations = resTable("reservations");
    const tables = resTable("restaurant_tables");
    if (!assign || !reservations || !tables) return false;

    await assign.upsert(
      { reservation_id: reservationId, table_id: tableId, assigned_at: new Date().toISOString() },
      { onConflict: "reservation_id" },
    );
    await reservations.update({ table_id: tableId }).eq("id", reservationId);
    await tables.update({ status: "reserved", updated_at: new Date().toISOString() }).eq("id", tableId);
    return true;
  } catch {
    return false;
  }
}

export async function updateTableStatus(tableId: string, status: RestaurantTable["status"]): Promise<void> {
  const t = resTable("restaurant_tables");
  if (!t) return;
  await t.update({ status, updated_at: new Date().toISOString() }).eq("id", tableId);
}
