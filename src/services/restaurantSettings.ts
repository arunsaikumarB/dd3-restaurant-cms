import { createClientIfConfigured } from "../lib/supabase/client";
import { isSupabaseConfigured } from "../lib/supabase/env";
import { SITE } from "../constants/site";
import type { RestaurantSettings, RestaurantSettingsInsert } from "../types/database";

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
};

export function buildDefaultRestaurantSettings(): Omit<
  RestaurantSettings,
  "id" | "created_at" | "updated_at"
> {
  return {
    restaurant_name: SITE.name,
    phone: SITE.phone,
    email: SITE.email,
    address: SITE.address,
    google_maps: SITE.mapEmbed,
    opening_hours: {
      weekday: "11:00 AM – 10:00 PM",
      weekend: "11:00 AM – 11:00 PM",
      sunday: "12:00 PM – 9:30 PM",
    },
    facebook: SITE.social.facebook,
    instagram: SITE.social.instagram,
    youtube: "",
    logo: null,
    favicon: null,
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
    order(column: string, options: { ascending: boolean }): {
      limit(count: number): {
        maybeSingle(): Promise<{ data: RestaurantSettings | null; error: SupabaseError | null }>;
      };
    };
  };
  insert(row: RestaurantSettingsInsert): {
    select(columns: string): {
      single(): Promise<{ data: RestaurantSettings | null; error: SupabaseError | null }>;
    };
  };
  update(row: Partial<RestaurantSettingsInsert>): {
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

/**
 * Fetch the singleton restaurant_settings row, creating defaults if missing.
 */
export async function getOrCreateRestaurantSettings(): Promise<RestaurantSettings> {
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
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    throw new Error(mapSupabaseError(fetchError));
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: insertError } = await table
    .insert(buildDefaultRestaurantSettings() as RestaurantSettingsInsert)
    .select("*")
    .single();

  if (insertError || !created) {
    throw new Error(mapSupabaseError(insertError ?? { message: "Failed to create default settings." }));
  }

  return created;
}

/**
 * Update restaurant settings by id.
 */
export async function updateRestaurantSettings(
  id: string,
  form: RestaurantSettingsForm,
): Promise<RestaurantSettings> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const supabase = createClientIfConfigured();
  if (!supabase) {
    throw new Error("Supabase client could not be initialized.");
  }

  const payload = formToUpdatePayload(form);
  const table = settingsTable(supabase);

  const { data, error } = await table
    .update(payload as Partial<RestaurantSettingsInsert>)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }));
  }

  return data;
}
