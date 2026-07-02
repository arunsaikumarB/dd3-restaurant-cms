import { createClientIfConfigured } from "../lib/supabase/client";
import { isSupabaseConfigured } from "../lib/supabase/env";
import {
  getGallerySectionDefinition,
  getPageFromSection,
  type GallerySectionKey,
} from "../config/gallerySections";
import type { GalleryImage, GalleryImageInsert, RestaurantLocationId } from "../types/database";
import { STORAGE_CACHE_CONTROL } from "../constants/storage";
import { deleteFile } from "./storage/upload";
import { mapSupabaseError } from "../utils/supabase/errors";

export const GALLERY_CATEGORIES = ["Food", "Ambiance", "Events", "Kitchen"] as const;

export type GallerySection = GallerySectionKey | "general";

export const GALLERY_LOCATIONS = [
  { value: "south-plainfield", label: "South Plainfield" },
  { value: "oak-tree", label: "Oak Tree" },
  { value: "lawrenceville", label: "Lawrenceville" },
  { value: "all", label: "All Locations" },
] as const;

export type GalleryLocationFilter = (typeof GALLERY_LOCATIONS)[number]["value"];

export type GalleryForm = {
  image: string | null;
  category: string;
  alt_text: string;
  title: string;
  caption: string;
  display_order: number;
  featured: boolean;
  visible: boolean;
  section: GallerySection;
  location_id: GalleryLocationFilter;
  page: string;
};

export type GalleryCardRow = {
  id: string;
  url: string;
  image: string;
  category: string;
  alt_text: string;
  title: string;
  caption: string;
  featured: boolean;
  visible: boolean;
  display_order: number;
  section: string;
  location_id: string;
  page: string;
  created_at: string;
};

export const EMPTY_GALLERY_FORM: GalleryForm = {
  image: null,
  category: GALLERY_CATEGORIES[0],
  alt_text: "",
  title: "",
  caption: "",
  display_order: 0,
  featured: false,
  visible: true,
  section: "ambience",
  location_id: "south-plainfield",
  page: "home",
};

export function rowToForm(row: GalleryCardRow): GalleryForm {
  return {
    image: row.image,
    category: row.category,
    alt_text: row.alt_text,
    title: row.title,
    caption: row.caption,
    display_order: row.display_order,
    featured: row.featured,
    visible: row.visible,
    section: (row.section as GallerySection) || "general",
    location_id: (row.location_id as GalleryLocationFilter) || "south-plainfield",
    page: row.page || getPageFromSection(row.section),
  };
}

export function formToPayload(form: GalleryForm): GalleryImageInsert {
  const section = form.section;
  return {
    image: form.image?.trim() ?? "",
    category: form.category.trim() || "Ambiance",
    alt_text: form.alt_text.trim() || form.title.trim() || section,
    title: form.title.trim() || null,
    caption: form.caption.trim() || null,
    display_order: Math.round(form.display_order),
    featured: form.featured,
    visible: form.visible,
    section,
    location_id: form.location_id,
    page: form.page || getPageFromSection(section),
  };
}

function mapGalleryRow(row: GalleryImage): GalleryCardRow {
  const caption = row.caption ?? "";
  const altText = row.alt_text ?? "";
  const title = row.title ?? "";

  return {
    id: row.id,
    url: row.image,
    image: row.image,
    category: row.category ?? "",
    alt_text: altText,
    title: title || caption || altText,
    caption,
    featured: row.featured ?? false,
    visible: row.visible ?? true,
    display_order: row.display_order,
    section: row.section ?? "general",
    location_id: row.location_id ?? "all",
    page: row.page ?? getPageFromSection(row.section ?? "general"),
    created_at: row.created_at,
  };
}

function sortGalleryRows(rows: GalleryCardRow[]): GalleryCardRow[] {
  return [...rows].sort((a, b) => {
    const orderDiff = a.display_order - b.display_order;
    if (orderDiff !== 0) return orderDiff;
    return b.created_at.localeCompare(a.created_at);
  });
}

type SupabaseError = { message: string; code?: string };

type GalleryQuery = {
  select(columns: string): Promise<{ data: GalleryImage[] | null; error: SupabaseError | null }>;
  insert(row: GalleryImageInsert): {
    select(columns: string): {
      single(): Promise<{ data: GalleryImage | null; error: SupabaseError | null }>;
    };
  };
  update(row: Partial<GalleryImageInsert>): {
    eq(column: string, value: string): {
      select(columns: string): {
        single(): Promise<{ data: GalleryImage | null; error: SupabaseError | null }>;
      };
    };
  };
  delete(): {
    eq(column: string, value: string): Promise<{ error: SupabaseError | null }>;
  };
};

function galleryTable(supabase: NonNullable<ReturnType<typeof createClientIfConfigured>>) {
  return supabase.from("gallery") as unknown as GalleryQuery;
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

export function storagePathFromUrl(imageUrl: string): string | null {
  const marker = "/gallery-images/";
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(imageUrl.slice(idx + marker.length).split("?")[0] ?? "");
}

export function matchesGalleryLocation(
  rowLocationId: string,
  selectedLocationId: string,
): boolean {
  return rowLocationId === selectedLocationId || rowLocationId === "all";
}

export async function fetchGalleryImages(): Promise<GalleryCardRow[]> {
  const supabase = requireClient();
  const { data, error } = await galleryTable(supabase).select("*");

  if (error) {
    throw new Error(mapSupabaseError(error, "load gallery images"));
  }

  return sortGalleryRows((data ?? []).map(mapGalleryRow));
}

export async function fetchPublicGalleryImages(): Promise<GalleryImage[] | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createClientIfConfigured();
  if (!supabase) {
    return null;
  }

  const { data, error } = await galleryTable(supabase).select("*");

  if (error) {
    return null;
  }

  return data ?? [];
}

export async function fetchGalleryBySection(
  section: string,
  locationId: RestaurantLocationId | string,
): Promise<GalleryImage[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = createClientIfConfigured();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("gallery")
    .select("*")
    .eq("section", section)
    .eq("visible", true)
    .or(`location_id.eq.${locationId},location_id.eq.all`)
    .order("display_order", { ascending: true });

  if (error) {
    return [];
  }

  return (data as GalleryImage[]) ?? [];
}

export async function fetchFeaturedGallery(
  locationId: RestaurantLocationId | string,
): Promise<GalleryImage[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = createClientIfConfigured();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("gallery")
    .select("*")
    .eq("featured", true)
    .eq("visible", true)
    .or(`location_id.eq.${locationId},location_id.eq.all`)
    .order("display_order", { ascending: true });

  if (error) {
    return [];
  }

  return (data as GalleryImage[]) ?? [];
}

export async function createGalleryImage(form: GalleryForm): Promise<GalleryCardRow> {
  const supabase = requireClient();
  const { data, error } = await galleryTable(supabase)
    .insert(formToPayload(form))
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Create failed." }, "create gallery image"));
  }

  return mapGalleryRow(data);
}

export async function updateGalleryImage(id: string, form: GalleryForm): Promise<GalleryCardRow> {
  const supabase = requireClient();
  const { data, error } = await galleryTable(supabase)
    .update(formToPayload(form))
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }, "update gallery image"));
  }

  return mapGalleryRow(data);
}

export async function updateGalleryFields(
  id: string,
  patch: Partial<GalleryImageInsert>,
): Promise<GalleryCardRow> {
  const supabase = requireClient();
  const { data, error } = await galleryTable(supabase)
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }, "update gallery image"));
  }

  return mapGalleryRow(data);
}

export async function updateGalleryFeatured(id: string, featured: boolean): Promise<GalleryCardRow> {
  return updateGalleryFields(id, { featured });
}

export async function updateGalleryVisible(id: string, visible: boolean): Promise<GalleryCardRow> {
  return updateGalleryFields(id, { visible });
}

export async function deleteGalleryImage(id: string, imageUrl?: string): Promise<void> {
  const supabase = requireClient();
  const { error } = await galleryTable(supabase).delete().eq("id", id);

  if (error) {
    throw new Error(mapSupabaseError(error, "delete gallery image"));
  }

  if (imageUrl) {
    const path = storagePathFromUrl(imageUrl);
    if (path) {
      try {
        await deleteFile("gallery-images", path);
      } catch {
        // DB row removed; storage cleanup is best-effort
      }
    }
  }
}

export function getGalleryCategoryOptions(): { value: string; label: string }[] {
  return GALLERY_CATEGORIES.map((category) => ({ value: category, label: category }));
}

export function getGalleryLocationOptions(): { value: string; label: string }[] {
  return GALLERY_LOCATIONS.map((location) => ({ value: location.value, label: location.label }));
}

export function getGallerySectionLabel(section: string): string {
  return getGallerySectionDefinition(section as GallerySectionKey)?.label ?? section;
}

export async function uploadGalleryImageFile(
  file: File,
  section: GallerySectionKey,
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "webp";
  const fileName = `${section}/${Date.now()}.${ext}`;
  const supabase = requireClient();
  const { error } = await supabase.storage.from("gallery-images").upload(fileName, file, {
    cacheControl: STORAGE_CACHE_CONTROL,
    upsert: false,
    contentType: file.type || "image/webp",
  });
  if (error) {
    throw new Error(error.message);
  }
  const { data } = supabase.storage.from("gallery-images").getPublicUrl(fileName);
  return data.publicUrl;
}
