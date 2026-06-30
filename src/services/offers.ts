import { createClientIfConfigured } from "../lib/supabase/client";
import { isSupabaseConfigured } from "../lib/supabase/env";
import type { LocationId } from "../config/locations";
import { getLocationConfig, LOCATION_IDS } from "../config/locations";
import type { Offer, OfferInsert } from "../types/database";
import {
  formatOfferDate,
  getOfferScheduleStatus,
  type OfferScheduleStatus,
} from "../utils/offers/schedule";
import { mapSupabaseError } from "../utils/supabase/errors";

export type OfferForm = {
  title: string;
  description: string;
  banner: string | null;
  discount: string;
  start_date: string;
  end_date: string;
  active: boolean;
};

export type OfferCardRow = {
  id: string;
  name: string;
  title: string;
  description: string;
  banner: string | null;
  discount: string;
  start_date: string;
  end_date: string;
  startDate: string;
  endDate: string;
  active: boolean;
  status: "active" | "inactive";
  scheduleStatus: OfferScheduleStatus;
  created_at: string;
  location_id?: LocationId;
  locationName?: string;
};

export const EMPTY_OFFER_FORM: OfferForm = {
  title: "",
  description: "",
  banner: null,
  discount: "",
  start_date: "",
  end_date: "",
  active: true,
};

export function rowToForm(row: OfferCardRow): OfferForm {
  return {
    title: row.title,
    description: row.description,
    banner: row.banner,
    discount: row.discount,
    start_date: row.start_date,
    end_date: row.end_date,
    active: row.active,
  };
}

export function formToPayload(form: OfferForm, locationId: LocationId): OfferInsert {
  return {
    location_id: locationId,
    title: form.title.trim(),
    description: form.description.trim() || null,
    banner: form.banner?.trim() || null,
    discount: form.discount.trim(),
    start_date: form.start_date,
    end_date: form.end_date,
    active: form.active,
  };
}

function formToUpdatePayload(form: OfferForm) {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    banner: form.banner?.trim() || null,
    discount: form.discount.trim(),
    start_date: form.start_date,
    end_date: form.end_date,
    active: form.active,
  };
}

function mapOfferRow(row: Offer): OfferCardRow {
  const startDate = formatOfferDate(row.start_date);
  const endDate = formatOfferDate(row.end_date);

  return {
    id: row.id,
    name: row.title,
    title: row.title,
    description: row.description ?? "",
    banner: row.banner,
    discount: row.discount ?? "",
    start_date: startDate,
    end_date: endDate,
    startDate,
    endDate,
    active: row.active,
    status: row.active ? "active" : "inactive",
    scheduleStatus: getOfferScheduleStatus(startDate, endDate),
    created_at: row.created_at,
  };
}

function sortOffers(rows: OfferCardRow[]): OfferCardRow[] {
  return [...rows].sort((a, b) => {
    if (a.active !== b.active) {
      return a.active ? -1 : 1;
    }
    return b.start_date.localeCompare(a.start_date);
  });
}

type SupabaseError = { message: string; code?: string };

type OffersQuery = {
  select(columns: string): {
    eq(column: string, value: string): Promise<{ data: Offer[] | null; error: SupabaseError | null }>;
  };
  insert(row: OfferInsert): {
    select(columns: string): {
      single(): Promise<{ data: Offer | null; error: SupabaseError | null }>;
    };
  };
  update(row: ReturnType<typeof formToUpdatePayload> | { active: boolean }): {
    eq(column: string, value: string): {
      select(columns: string): {
        single(): Promise<{ data: Offer | null; error: SupabaseError | null }>;
      };
    };
  };
  delete(): {
    eq(column: string, value: string): Promise<{ error: SupabaseError | null }>;
  };
};

function offersTable(supabase: NonNullable<ReturnType<typeof createClientIfConfigured>>) {
  return supabase.from("offers") as unknown as OffersQuery;
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

export async function fetchOffers(locationId: LocationId): Promise<OfferCardRow[]> {
  const supabase = requireClient();
  const { data, error } = await offersTable(supabase).select("*").eq("location_id", locationId);

  if (error) {
    throw new Error(mapSupabaseError(error, "load offers"));
  }

  return sortOffers((data ?? []).map(mapOfferRow));
}

export async function fetchAllOffers(): Promise<OfferCardRow[]> {
  const results = await Promise.all(
    LOCATION_IDS.map(async (locationId) => {
      const rows = await fetchOffers(locationId);
      const locationName = getLocationConfig(locationId).shortName;
      return rows.map((row) => ({ ...row, location_id: locationId, locationName }));
    }),
  );
  return results.flat();
}

/**
 * Public read-only fetch for offer sections (active offers only via RLS).
 */
export async function fetchPublicOffers(locationId: LocationId): Promise<Offer[] | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createClientIfConfigured();
  if (!supabase) {
    return null;
  }

  const { data, error } = await offersTable(supabase).select("*").eq("location_id", locationId);

  if (error) {
    return null;
  }

  return data ?? [];
}

export async function createOffer(form: OfferForm, locationId: LocationId): Promise<OfferCardRow> {
  const supabase = requireClient();
  const { data, error } = await offersTable(supabase)
    .insert(formToPayload(form, locationId))
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Create failed." }, "create offer"));
  }

  return mapOfferRow(data);
}

export async function updateOffer(id: string, form: OfferForm): Promise<OfferCardRow> {
  const supabase = requireClient();
  const { data, error } = await offersTable(supabase)
    .update(formToUpdatePayload(form))
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }, "update offer"));
  }

  return mapOfferRow(data);
}

export async function updateOfferActive(id: string, active: boolean): Promise<OfferCardRow> {
  const supabase = requireClient();
  const { data, error } = await offersTable(supabase)
    .update({ active })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }, "update offer status"));
  }

  return mapOfferRow(data);
}

export async function deleteOffer(id: string): Promise<void> {
  const supabase = requireClient();
  const { error } = await offersTable(supabase).delete().eq("id", id);

  if (error) {
    throw new Error(mapSupabaseError(error, "delete offer"));
  }
}

export function scheduleStatusLabel(status: OfferScheduleStatus): string {
  if (status === "current") return "Current";
  if (status === "upcoming") return "Upcoming";
  return "Expired";
}

export function scheduleStatusVariant(
  status: OfferScheduleStatus,
): "success" | "warning" | "danger" | "info" | "default" | "outline" {
  if (status === "current") return "success";
  if (status === "upcoming") return "info";
  return "outline";
}
