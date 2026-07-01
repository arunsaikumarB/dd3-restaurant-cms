import { createClientIfConfigured } from "../lib/supabase/client";
import { isSupabaseConfigured } from "../lib/supabase/env";
import type { LocationId } from "../config/locations";
import { getLocationConfig, LOCATION_IDS } from "../config/locations";
import type { OfferContentSection } from "../data/offers/types";
import type { Offer, OfferInsert, Json } from "../types/database";
import {
  formatOfferDate,
  getOfferScheduleStatus,
  type OfferScheduleStatus,
} from "../utils/offers/schedule";
import { LocationScopeError } from "../utils/supabase/locationScope";
import { mapSupabaseError } from "../utils/supabase/errors";

export type OfferForm = {
  title: string;
  slug: string;
  description: string;
  image: string | null;
  gallery: string[];
  badge: string;
  category: string;
  price: string;
  valid_until: string;
  start_date: string;
  end_date: string;
  featured: boolean;
  terms: string[];
  content: OfferContentSection[];
  display_order: number;
  order_category: string;
  active: boolean;
};

export type OfferCardRow = {
  id: string;
  name: string;
  title: string;
  slug: string;
  description: string;
  image: string | null;
  badge: string;
  valid_until: string;
  validUntil: string;
  start_date: string;
  end_date: string;
  startDate: string;
  endDate: string;
  featured: boolean;
  display_order: number;
  active: boolean;
  status: "active" | "inactive";
  scheduleStatus: OfferScheduleStatus;
  created_at: string;
  location_id?: LocationId;
  locationName?: string;
};

export const EMPTY_OFFER_CONTENT_SECTION: OfferContentSection = {
  heading: "",
  paragraphs: [""],
  list: [],
};

export const EMPTY_OFFER_FORM: OfferForm = {
  title: "",
  slug: "",
  description: "",
  image: null,
  gallery: [],
  badge: "",
  category: "",
  price: "",
  valid_until: "",
  start_date: "",
  end_date: "",
  featured: false,
  terms: [],
  content: [{ ...EMPTY_OFFER_CONTENT_SECTION }],
  display_order: 0,
  order_category: "",
  active: true,
};

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseContentSections(value: unknown): OfferContentSection[] {
  if (!Array.isArray(value)) return [];

  const sections: OfferContentSection[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const heading = typeof record.heading === "string" ? record.heading : "";
    const eyebrow = typeof record.eyebrow === "string" ? record.eyebrow : undefined;
    const paragraphs = parseStringArray(record.paragraphs);
    const list = parseStringArray(record.list);
    if (!heading.trim() && paragraphs.length === 0 && list.length === 0) continue;

    sections.push({
      eyebrow,
      heading,
      paragraphs: paragraphs.length > 0 ? paragraphs : [""],
      list: list.length > 0 ? list : undefined,
    });
  }

  return sections.length > 0 ? sections : [{ ...EMPTY_OFFER_CONTENT_SECTION }];
}

function sanitizeContentSections(sections: OfferContentSection[]): OfferContentSection[] {
  return sections
    .map((section) => ({
      eyebrow: section.eyebrow?.trim() || undefined,
      heading: section.heading.trim(),
      paragraphs: section.paragraphs.map((p) => p.trim()).filter(Boolean),
      list: section.list?.map((item) => item.trim()).filter(Boolean),
    }))
    .filter((section) => section.heading || section.paragraphs.length > 0 || (section.list?.length ?? 0) > 0);
}

function sanitizeGallery(urls: string[]): string[] {
  return urls.map((url) => url.trim()).filter(Boolean);
}

function sanitizeTerms(terms: string[]): string[] {
  return terms.map((term) => term.trim()).filter(Boolean);
}

function displayValidUntil(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function offerRowToForm(row: Offer): OfferForm {
  const startDate = formatOfferDate(row.start_date);
  const endDate = formatOfferDate(row.end_date);
  const validUntil = displayValidUntil(row.valid_until);

  return {
    title: row.title,
    slug: row.slug ?? "",
    description: row.description ?? "",
    image: row.image ?? row.banner,
    gallery: parseStringArray(row.gallery),
    badge: row.badge ?? row.discount ?? "",
    category: row.category ?? "",
    price: row.price ?? "",
    valid_until: validUntil,
    start_date: startDate,
    end_date: endDate,
    featured: row.featured,
    terms: parseStringArray(row.terms),
    content: parseContentSections(row.content),
    display_order: row.display_order ?? 0,
    order_category: row.order_category ?? "",
    active: row.active,
  };
}

function formToPayload(form: OfferForm, locationId: LocationId): OfferInsert {
  const image = form.image?.trim() || null;
  const badge = form.badge.trim() || null;
  const validUntil = form.valid_until.trim() || null;
  const content = sanitizeContentSections(form.content);

  return {
    location_id: locationId,
    slug: form.slug.trim(),
    title: form.title.trim(),
    description: form.description.trim() || null,
    image,
    gallery: sanitizeGallery(form.gallery) as Json,
    badge,
    category: form.category.trim() || null,
    price: form.price.trim() || null,
    valid_until: validUntil,
    featured: form.featured,
    terms: sanitizeTerms(form.terms) as Json,
    content: content as Json,
    display_order: form.display_order,
    order_category: form.order_category.trim() || null,
    active: form.active,
    banner: image,
    discount: badge,
    start_date: form.start_date.trim() || null,
    end_date: form.end_date.trim() || null,
  };
}

function formToUpdatePayload(form: OfferForm) {
  const payload = formToPayload(form, "south-plainfield");
  const { location_id: _locationId, ...update } = payload;
  return update;
}

function mapOfferRow(row: Offer): OfferCardRow {
  const startDate = formatOfferDate(row.start_date);
  const endDate = formatOfferDate(row.end_date);
  const validUntil = displayValidUntil(row.valid_until);

  return {
    id: row.id,
    name: row.title,
    title: row.title,
    slug: row.slug ?? "",
    description: row.description ?? "",
    image: row.image ?? row.banner,
    badge: row.badge ?? row.discount ?? "",
    valid_until: validUntil,
    validUntil,
    start_date: startDate,
    end_date: endDate,
    startDate,
    endDate,
    featured: row.featured,
    display_order: row.display_order ?? 0,
    active: row.active,
    status: row.active ? "active" : "inactive",
    scheduleStatus: getOfferScheduleStatus(startDate, endDate),
    created_at: row.created_at,
    location_id: row.location_id,
  };
}

function sortOffers(rows: OfferCardRow[]): OfferCardRow[] {
  return [...rows].sort((a, b) => {
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order;
    }
    if (a.active !== b.active) {
      return a.active ? -1 : 1;
    }
    return b.created_at.localeCompare(a.created_at);
  });
}

type SupabaseError = { message: string; code?: string };

type OffersQuery = {
  select(columns: string): {
    eq(column: string, value: string): {
      order?(
        column: string,
        options: { ascending: boolean },
      ): Promise<{ data: Offer[] | null; error: SupabaseError | null }>;
    } & Promise<{ data: Offer[] | null; error: SupabaseError | null }>;
    maybeSingle(): Promise<{ data: Offer | null; error: SupabaseError | null }>;
  };
  insert(row: OfferInsert): {
    select(columns: string): {
      single(): Promise<{ data: Offer | null; error: SupabaseError | null }>;
    };
  };
  update(row: ReturnType<typeof formToUpdatePayload> | { active: boolean } | { featured: boolean }): {
    eq(column: string, value: string): {
      eq(column: string, value: string): {
        select(columns: string): {
          single(): Promise<{ data: Offer | null; error: SupabaseError | null }>;
        };
      };
    };
  };
  delete(): {
    eq(column: string, value: string): {
      eq(column: string, value: string): Promise<{ error: SupabaseError | null }>;
    };
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

export async function fetchOfferById(
  id: string,
  locationId: LocationId,
): Promise<Offer | null> {
  const supabase = requireClient();
  const { data, error } = await offersTable(supabase).select("*").eq("location_id", locationId);

  if (error) {
    throw new Error(mapSupabaseError(error, "load offer"));
  }

  return (data ?? []).find((row) => row.id === id) ?? null;
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
 * Public read-only fetch for CMS offers at a location (sorted by display_order).
 * Inactive rows are excluded via RLS for anonymous users and filtered again in offersPublic.
 */
export async function fetchPublicOffers(locationId: LocationId): Promise<Offer[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = createClientIfConfigured();
  if (!supabase) {
    return [];
  }

  const { data, error } = await offersTable(supabase).select("*").eq("location_id", locationId);

  if (error) {
    return [];
  }

  return [...(data ?? [])]
    .filter((row) => row.active)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
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

export async function updateOffer(
  id: string,
  form: OfferForm,
  locationId: LocationId,
): Promise<OfferCardRow> {
  const supabase = requireClient();
  const { data, error } = await offersTable(supabase)
    .update(formToUpdatePayload(form))
    .eq("id", id)
    .eq("location_id", locationId)
    .select("*")
    .single();

  if (error?.code === "PGRST116" || (!error && !data)) {
    throw new LocationScopeError();
  }
  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }, "update offer"));
  }

  return mapOfferRow(data);
}

export async function updateOfferActive(
  id: string,
  active: boolean,
  locationId: LocationId,
): Promise<OfferCardRow> {
  const supabase = requireClient();
  const { data, error } = await offersTable(supabase)
    .update({ active })
    .eq("id", id)
    .eq("location_id", locationId)
    .select("*")
    .single();

  if (error?.code === "PGRST116" || (!error && !data)) {
    throw new LocationScopeError();
  }
  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }, "update offer status"));
  }

  return mapOfferRow(data);
}

export async function updateOfferFeatured(
  id: string,
  featured: boolean,
  locationId: LocationId,
): Promise<OfferCardRow> {
  const supabase = requireClient();
  const { data, error } = await offersTable(supabase)
    .update({ featured })
    .eq("id", id)
    .eq("location_id", locationId)
    .select("*")
    .single();

  if (error?.code === "PGRST116" || (!error && !data)) {
    throw new LocationScopeError();
  }
  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }, "update offer featured status"));
  }

  return mapOfferRow(data);
}

export async function deleteOffer(id: string, locationId: LocationId): Promise<void> {
  const supabase = requireClient();
  const { error } = await offersTable(supabase).delete().eq("id", id).eq("location_id", locationId);

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
