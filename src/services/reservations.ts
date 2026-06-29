import { createClientIfConfigured } from "../lib/supabase/client";
import { isSupabaseConfigured } from "../lib/supabase/env";
import type { Reservation, ReservationInsert, ReservationStatus } from "../types/database";
import { mapSupabaseError } from "../utils/supabase/errors";

export type ReservationForm = {
  customer_name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  guests: number;
  special_request: string;
  status: ReservationStatus;
};

export type ReservationTableRow = {
  id: string;
  name: string;
  customer_name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  time_value: string;
  guests: number;
  notes: string;
  special_request: string;
  status: ReservationStatus;
  created_at: string;
};

export const EMPTY_RESERVATION_FORM: ReservationForm = {
  customer_name: "",
  phone: "",
  email: "",
  date: "",
  time: "",
  guests: 2,
  special_request: "",
  status: "pending",
};

export const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All Statuses" },
  ...STATUS_OPTIONS,
];

export const GUESTS_FILTER_OPTIONS = [
  { value: "all", label: "All Guests" },
  { value: "1", label: "1 Guest" },
  { value: "2", label: "2 Guests" },
  { value: "3", label: "3 Guests" },
  { value: "4", label: "4 Guests" },
  { value: "5", label: "5 Guests" },
  { value: "6+", label: "6+ Guests" },
];

export function rowToForm(row: ReservationTableRow): ReservationForm {
  return {
    customer_name: row.customer_name,
    phone: row.phone,
    email: row.email,
    date: row.date,
    time: row.time_value,
    guests: row.guests,
    special_request: row.special_request,
    status: row.status,
  };
}

export function formToPayload(form: ReservationForm): ReservationInsert {
  return {
    customer_name: form.customer_name.trim(),
    phone: form.phone.trim(),
    email: form.email.trim() || null,
    date: form.date.trim(),
    time: formatTimeForDb(form.time.trim()),
    guests: Math.round(form.guests),
    special_request: form.special_request.trim() || null,
    status: form.status,
  };
}

function normalizeTimeForInput(time: string): string {
  return time.slice(0, 5);
}

function formatTimeForDb(time: string): string {
  if (time.length === 5) return `${time}:00`;
  return time;
}

export function formatTimeForDisplay(time: string): string {
  const [hourPart, minutePart = "0"] = time.split(":");
  const hours = Number.parseInt(hourPart, 10);
  const minutes = Number.parseInt(minutePart, 10);

  if (Number.isNaN(hours)) return time;

  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function mapReservationRow(row: Reservation): ReservationTableRow {
  const specialRequest = row.special_request ?? "";

  return {
    id: row.id,
    name: row.customer_name,
    customer_name: row.customer_name,
    phone: row.phone,
    email: row.email ?? "",
    date: row.date,
    time: formatTimeForDisplay(row.time),
    time_value: normalizeTimeForInput(row.time),
    guests: row.guests,
    notes: specialRequest,
    special_request: specialRequest,
    status: row.status,
    created_at: row.created_at,
  };
}

function sortReservationsNewest(rows: ReservationTableRow[]): ReservationTableRow[] {
  return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

type SupabaseError = { message: string; code?: string };

type ReservationsQuery = {
  select(columns: string): Promise<{ data: Reservation[] | null; error: SupabaseError | null }>;
  insert(row: ReservationInsert): {
    select(columns: string): {
      single(): Promise<{ data: Reservation | null; error: SupabaseError | null }>;
    };
  };
  update(row: Partial<ReservationInsert>): {
    eq(column: string, value: string): {
      select(columns: string): {
        single(): Promise<{ data: Reservation | null; error: SupabaseError | null }>;
      };
    };
  };
  delete(): {
    eq(column: string, value: string): Promise<{ error: SupabaseError | null }>;
  };
};

function reservationsTable(supabase: NonNullable<ReturnType<typeof createClientIfConfigured>>) {
  return supabase.from("reservations") as unknown as ReservationsQuery;
}

function requireClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  const supabase = createClientIfConfigured();
  if (!supabase) {
    throw new Error("Supabase client could not be initialized.");
  }
  return supabase;
}

export async function fetchReservations(): Promise<ReservationTableRow[]> {
  const supabase = requireClient();
  const { data, error } = await reservationsTable(supabase).select("*");

  if (error) {
    throw new Error(mapSupabaseError(error, "load reservations"));
  }

  return sortReservationsNewest((data ?? []).map(mapReservationRow));
}

export async function createReservation(form: ReservationForm): Promise<ReservationTableRow> {
  const supabase = requireClient();
  const { data, error } = await reservationsTable(supabase)
    .insert(formToPayload(form))
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Create failed." }, "create reservation"));
  }

  return mapReservationRow(data);
}

export async function updateReservation(id: string, form: ReservationForm): Promise<ReservationTableRow> {
  const supabase = requireClient();
  const { data, error } = await reservationsTable(supabase)
    .update(formToPayload(form))
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }, "update reservation"));
  }

  return mapReservationRow(data);
}

export async function updateReservationStatus(
  id: string,
  status: ReservationStatus,
): Promise<ReservationTableRow> {
  const supabase = requireClient();
  const { data, error } = await reservationsTable(supabase)
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }, "update reservation status"));
  }

  return mapReservationRow(data);
}

export async function deleteReservation(id: string): Promise<void> {
  const supabase = requireClient();
  const { error } = await reservationsTable(supabase).delete().eq("id", id);

  if (error) {
    throw new Error(mapSupabaseError(error, "delete reservation"));
  }
}
