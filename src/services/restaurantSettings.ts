import { createClientIfConfigured } from "../lib/supabase/client";
import { isSupabaseConfigured } from "../lib/supabase/env";
import { getLocationConfig, type LocationId, type OpeningHoursRow } from "../config/locations";
import { getOrderUrl } from "../data/chefgaaNameMap";
import type { RestaurantSettings, RestaurantSettingsInsert } from "../types/database";
import { LocationScopeError } from "../utils/supabase/locationScope";
import { isOrderUrlForLocation } from "../utils/locationLinks";
import {
  normalizePhoneList,
  parsePhonesFromRow,
  primaryPhone,
} from "../utils/restaurantPhones";

export function getCanonicalOrderUrl(locationId: LocationId): string {
  return getOrderUrl(locationId);
}

export type { OpeningHoursRow };

/** Ordered list of admin-editable day-group hours, e.g. [{days:"Mon – Fri", time:"11am-10pm"}, ...]. */
export type OpeningHoursForm = OpeningHoursRow[];

/** Legacy shape stored by older rows, before hours became a flexible list. */
type LegacyOpeningHours = { weekday?: string; weekend?: string; sunday?: string };

/** Normalizes a raw DB `Json` value into the flexible row list, migrating the old
 *  {weekday, weekend, sunday} shape transparently. Falls back when empty/invalid. */
export function normalizeOpeningHours(
  value: unknown,
  fallback: OpeningHoursRow[],
): OpeningHoursRow[] {
  if (Array.isArray(value)) {
    const rows = value
      .map((item, index): OpeningHoursRow | null => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        const days = typeof record.days === "string" ? record.days.trim() : "";
        const time = typeof record.time === "string" ? record.time.trim() : "";
        if (!days && !time) return null;
        return {
          id: typeof record.id === "string" && record.id ? record.id : `row-${index}`,
          days,
          time,
        };
      })
      .filter((row): row is OpeningHoursRow => row !== null);
    return rows.length > 0 ? rows : fallback;
  }

  if (value && typeof value === "object") {
    const legacy = value as LegacyOpeningHours;
    const rows: OpeningHoursRow[] = [];
    if (legacy.weekday?.trim()) rows.push({ id: "weekday", days: "Mon – Thu", time: legacy.weekday.trim() });
    if (legacy.weekend?.trim()) rows.push({ id: "weekend", days: "Fri – Sat", time: legacy.weekend.trim() });
    if (legacy.sunday?.trim()) rows.push({ id: "sunday", days: "Sun", time: legacy.sunday.trim() });
    return rows.length > 0 ? rows : fallback;
  }

  return fallback;
}

export type RestaurantSettingsForm = {
  restaurant_name: string;
  phones: string[];
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
    phones: [location.phone],
    email: location.email,
    address: location.address,
    google_maps: location.googleMapsEmbed,
    opening_hours: location.openingHours,
    facebook: "",
    instagram: "",
    youtube: "",
    logo: null,
    favicon: null,
    reservation_url: location.reservationLink,
    order_url: getOrderUrl(locationId),
    seo_title: "",
    seo_description: "",
    seo_keywords: "",
  };
}

export function rowToForm(row: RestaurantSettings): RestaurantSettingsForm {
  const phones = parsePhonesFromRow(row.phones, row.phone);
  const fallbackHours = getLocationConfig(row.location_id as LocationId).openingHours;
  return {
    restaurant_name: row.restaurant_name ?? "",
    phones: phones.length > 0 ? phones : [""],
    email: row.email ?? "",
    address: row.address ?? "",
    google_maps: row.google_maps ?? "",
    opening_hours: normalizeOpeningHours(row.opening_hours, fallbackHours),
    facebook: row.facebook ?? "",
    instagram: row.instagram ?? "",
    youtube: row.youtube ?? "",
    logo: row.logo,
    favicon: row.favicon,
    reservation_url: row.reservation_url ?? "",
    order_url: row.order_url?.trim() || getOrderUrl(row.location_id),
    seo_title: row.seo_title ?? "",
    seo_description: row.seo_description ?? "",
    seo_keywords: row.seo_keywords ?? "",
  };
}

export function formToUpdatePayload(form: RestaurantSettingsForm) {
  const phones = normalizePhoneList(form.phones);
  return {
    restaurant_name: form.restaurant_name.trim(),
    phone: primaryPhone(phones) || null,
    phones,
    email: form.email.trim() || null,
    address: form.address.trim() || null,
    google_maps: form.google_maps.trim() || null,
    opening_hours: form.opening_hours
      .map((row) => ({ id: row.id, days: row.days.trim(), time: row.time.trim() }))
      .filter((row) => row.days || row.time),
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
  update(row: ReturnType<typeof formToUpdatePayload> | { order_url: string }): {
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

/** Persists the canonical ChefGaa order URL when CMS value is missing or wrong. */
async function repairOrderUrlIfNeeded(
  table: SettingsQuery,
  locationId: LocationId,
  row: RestaurantSettings,
): Promise<RestaurantSettings> {
  const canonical = getOrderUrl(locationId);
  const current = row.order_url?.trim();
  if (current && isOrderUrlForLocation(current, locationId)) {
    return row;
  }

  const { data, error } = await table
    .update({ order_url: canonical })
    .eq("location_id", locationId)
    .select("*")
    .single();

  if (error || !data) {
    return { ...row, order_url: canonical };
  }

  return data;
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
    return repairOrderUrlIfNeeded(table, locationId, existing);
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
