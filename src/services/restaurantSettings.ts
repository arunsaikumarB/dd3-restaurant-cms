import { createClientIfConfigured } from "../lib/supabase/client";
import { isSupabaseConfigured } from "../lib/supabase/env";
import { getLocationConfig, type LocationId } from "../config/locations";
import type { RestaurantSettings, RestaurantSettingsInsert } from "../types/database";
import { LocationScopeError } from "../utils/supabase/locationScope";

export type OpeningHoursForm = {
  weekday: string;
  weekend: string;
  sunday: string;
};

export type RestaurantSettingsForm = {
  restaurant_name: string;
  phone: string;
  email: string;
  address: string;
  google_maps: string;
  opening_hours: OpeningHoursForm;
  facebook: string;
  instagram: string;
  youtube: string;
  logo: string | null;
  favicon: string | null;
  reservation_url: string;
  order_url: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
};

export function buildDefaultRestaurantSettings(
  locationId: LocationId,
): Omit<RestaurantSettings, "id" | "created_at" | "updated_at"> {
  const location = getLocationConfig(locationId);
  return {
    location_id: locationId,
    restaurant_name: `Desi Dhamaka — ${location.shortName}`,
    phone: location.phone,
    email: location.email,
    address: location.address,
    google_maps: location.googleMapsEmbed,
    opening_hours: {
      weekday: location.openingHours.weekday,
      weekend: location.openingHours.weekend,
      sunday: location.openingHours.sunday,
    },
    facebook: "",
    instagram: "",
    youtube: "",
    logo: null,
    favicon: null,
    reservation_url: location.reservationLink,
    order_url: location.orderDirectLink,
    seo_title: "",
    seo_description: "",
    seo_keywords: "",
  };
}

export function rowToForm(row: RestaurantSettings): RestaurantSettingsForm {
  const hours =
    row.opening_hours && typeof row.opening_hours === "object" && !Array.isArray(row.opening_hours)
      ? (row.opening_hours as Record<string, string>)
      : {};
  return {
    restaurant_name: row.restaurant_name ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    address: row.address ?? "",
    google_maps: row.google_maps ?? "",
    opening_hours: {
      weekday: hours.weekday ?? "",
      weekend: hours.weekend ?? "",
      sunday: hours.sunday ?? "",
    },
    facebook: row.facebook ?? "",
    instagram: row.instagram ?? "",
    youtube: row.youtube ?? "",
    logo: row.logo,
    favicon: row.favicon,
    reservation_url: row.reservation_url ?? "",
    order_url: row.order_url ?? "",
    seo_title: row.seo_title ?? "",
    seo_description: row.seo_description ?? "",
    seo_keywords: row.seo_keywords ?? "",
  };
}

export function formToUpdatePayload(form: RestaurantSettingsForm) {
  return {
    restaurant_name: form.restaurant_name.trim(),
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    address: form.address.trim() || null,
    google_maps: form.google_maps.trim() || null,
    opening_hours: {
      weekday: form.opening_hours.weekday.trim(),
      weekend: form.opening_hours.weekend.trim(),
      sunday: form.opening_hours.sunday.trim(),
    },
    facebook: form.facebook.trim() || null,
    instagram: form.instagram.trim() || null,
    youtube: form.youtube.trim() || null,
    logo: form.logo?.trim() || null,
    favicon: form.favicon?.trim() || null,
    reservation_url: form.reservation_url.trim() || null,
    order_url: form.order_url.trim() || null,
    seo_title: form.seo_title.trim() || null,
    seo_description: form.seo_description.trim() || null,
    seo_keywords: form.seo_keywords.trim() || null,
  };
}

function mapSupabaseError(error: { message: string; code?: string }): string {
  if (error.code === "42501" || error.message.toLowerCase().includes("permission")) {
    return "You do not have permission to update settings. Please sign in as an admin.";
  }
  if (error.message.toLowerCase().includes("network")) {
    return "Network error. Check your connection and try again.";
  }
  return error.message || "Something went wrong. Please try again.";
}

type SupabaseError = { message: string; code?: string };

type SettingsQuery = {
  select(columns: string): {
    eq(column: string, value: string): {
      maybeSingle(): Promise<{ data: RestaurantSettings | null; error: SupabaseError | null }>;
    };
    order(column: string, options: { ascending: boolean }): Promise<{
      data: RestaurantSettings[] | null;
      error: SupabaseError | null;
    }>;
  };
  insert(row: RestaurantSettingsInsert): {
    select(columns: string): {
      single(): Promise<{ data: RestaurantSettings | null; error: SupabaseError | null }>;
    };
  };
  update(row: ReturnType<typeof formToUpdatePayload>): {
    eq(column: string, value: string): {
      select(columns: string): {
        single(): Promise<{ data: RestaurantSettings | null; error: SupabaseError | null }>;
      };
    };
  };
};

function settingsTable(supabase: NonNullable<ReturnType<typeof createClientIfConfigured>>) {
  return supabase.from("restaurant_settings") as unknown as SettingsQuery;
}

export async function getOrCreateRestaurantSettings(
  locationId: LocationId,
): Promise<RestaurantSettings> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const supabase = createClientIfConfigured();
  if (!supabase) {
    throw new Error("Supabase client could not be initialized.");
  }

  const table = settingsTable(supabase);

  const { data: existing, error: fetchError } = await table
    .select("*")
    .eq("location_id", locationId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(mapSupabaseError(fetchError));
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: insertError } = await table
    .insert(buildDefaultRestaurantSettings(locationId) as RestaurantSettingsInsert)
    .select("*")
    .single();

  if (insertError || !created) {
    throw new Error(mapSupabaseError(insertError ?? { message: "Failed to create default settings." }));
  }

  return created;
}

export async function fetchAllRestaurantSettings(): Promise<RestaurantSettings[]> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const supabase = createClientIfConfigured();
  if (!supabase) {
    throw new Error("Supabase client could not be initialized.");
  }

  const { data, error } = await settingsTable(supabase)
    .select("*")
    .order("location_id", { ascending: true });

  if (error) {
    throw new Error(mapSupabaseError(error));
  }

  return data ?? [];
}

export async function updateRestaurantSettings(
  locationId: LocationId,
  form: RestaurantSettingsForm,
): Promise<RestaurantSettings> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const supabase = createClientIfConfigured();
  if (!supabase) {
    throw new Error("Supabase client could not be initialized.");
  }

  const table = settingsTable(supabase);

  const { data, error } = await table
    .update(formToUpdatePayload(form))
    .eq("location_id", locationId)
    .select("*")
    .single();

  if (error?.code === "PGRST116" || (!error && !data)) {
    throw new LocationScopeError();
  }
  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }));
  }

  return data;
}

export async function fetchRestaurantSettingsPublic(
  locationId: LocationId,
): Promise<RestaurantSettings | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createClientIfConfigured();
  if (!supabase) {
    return null;
  }

  const { data, error } = await settingsTable(supabase)
    .select("*")
    .eq("location_id", locationId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data;
}
