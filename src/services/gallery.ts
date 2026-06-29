import { createClientIfConfigured } from "../lib/supabase/client";
import { isSupabaseConfigured } from "../lib/supabase/env";
import type { GalleryImage, GalleryImageInsert } from "../types/database";
import { mapSupabaseError } from "../utils/supabase/errors";

export const GALLERY_CATEGORIES = ["Food", "Ambiance", "Events", "Kitchen"] as const;

export type GalleryForm = {
  image: string | null;
  category: string;
  alt_text: string;
  caption: string;
  display_order: number;
  featured: boolean;
  visible: boolean;
};

export type GalleryCardRow = {
  id: string;
  url: string;
  image: string;
  category: string;
  alt_text: string;
  caption: string;
  title: string;
  featured: boolean;
  visible: boolean;
  display_order: number;
  created_at: string;
};

export const EMPTY_GALLERY_FORM: GalleryForm = {
  image: null,
  category: GALLERY_CATEGORIES[0],
  alt_text: "",
  caption: "",
  display_order: 0,
  featured: false,
  visible: true,
};

export function rowToForm(row: GalleryCardRow): GalleryForm {
  return {
    image: row.image,
    category: row.category,
    alt_text: row.alt_text,
    caption: row.caption,
    display_order: row.display_order,
    featured: row.featured,
    visible: row.visible,
  };
}

export function formToPayload(form: GalleryForm): GalleryImageInsert {
  return {
    image: form.image?.trim() ?? "",
    category: form.category.trim(),
    alt_text: form.alt_text.trim(),
    caption: form.caption.trim() || null,
    display_order: Math.round(form.display_order),
    featured: form.featured,
    visible: form.visible,
  };
}

function mapGalleryRow(row: GalleryImage): GalleryCardRow {
  const caption = row.caption ?? "";
  const altText = row.alt_text ?? "";

  return {
    id: row.id,
    url: row.image,
    image: row.image,
    category: row.category ?? "",
    alt_text: altText,
    caption,
    title: caption || altText,
    featured: row.featured ?? false,
    visible: row.visible ?? true,
    display_order: row.display_order,
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

export async function fetchGalleryImages(): Promise<GalleryCardRow[]> {
  const supabase = requireClient();
  const { data, error } = await galleryTable(supabase).select("*");

  if (error) {
    throw new Error(mapSupabaseError(error, "load gallery images"));
  }

  return sortGalleryRows((data ?? []).map(mapGalleryRow));
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

export async function updateGalleryFeatured(id: string, featured: boolean): Promise<GalleryCardRow> {
  const supabase = requireClient();
  const { data, error } = await galleryTable(supabase)
    .update({ featured })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }, "update featured status"));
  }

  return mapGalleryRow(data);
}

export async function updateGalleryVisible(id: string, visible: boolean): Promise<GalleryCardRow> {
  const supabase = requireClient();
  const { data, error } = await galleryTable(supabase)
    .update({ visible })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }, "update visibility"));
  }

  return mapGalleryRow(data);
}

export async function deleteGalleryImage(id: string): Promise<void> {
  const supabase = requireClient();
  const { error } = await galleryTable(supabase).delete().eq("id", id);

  if (error) {
    throw new Error(mapSupabaseError(error, "delete gallery image"));
  }
}

export function getGalleryCategoryOptions(): { value: string; label: string }[] {
  return GALLERY_CATEGORIES.map((category) => ({ value: category, label: category }));
}
