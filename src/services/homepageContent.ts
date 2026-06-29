import { createClientIfConfigured } from "../lib/supabase/client";
import { isSupabaseConfigured } from "../lib/supabase/env";
import { ORDER_DIRECT_URL } from "../constants/ordering";
import { HOMEPAGE_SECTIONS } from "../admin/data/mock";
import type { HomepageSection } from "../admin/types";
import type { HomepageContent, HomepageContentInsert } from "../types/database";

export type HomepageContentForm = {
  hero_title: string;
  hero_subtitle: string;
  hero_image: string | null;
  hero_video: string | null;
  cta_text: string;
  cta_link: string;
  about_title: string;
  about_description: string;
};

function fieldValue(sectionId: string, key: string, fallback = ""): string {
  const section = HOMEPAGE_SECTIONS.find((s) => s.id === sectionId);
  return section?.fields.find((f) => f.key === key)?.value ?? fallback;
}

export function buildDefaultHomepageContent(): Omit<
  HomepageContent,
  "id" | "created_at" | "updated_at"
> {
  return {
    hero_title: fieldValue("hero", "title", "Authentic Indian Cuisine"),
    hero_subtitle: fieldValue(
      "hero",
      "subtitle",
      "Experience the rich flavors of India in Lawrenceville, NJ",
    ),
    hero_image: "/hero/hero-poster.jpg",
    hero_video: "/hero/videoplayback.mp4",
    cta_text: fieldValue("hero", "cta1", "Order Now"),
    cta_link: ORDER_DIRECT_URL,
    about_title: fieldValue("featured", "heading", "Signature Special Dishes"),
    about_description: fieldValue(
      "featured",
      "subheading",
      "Discover our chef's most celebrated creations",
    ),
  };
}

export function rowToForm(row: HomepageContent): HomepageContentForm {
  return {
    hero_title: row.hero_title ?? "",
    hero_subtitle: row.hero_subtitle ?? "",
    hero_image: row.hero_image,
    hero_video: row.hero_video,
    cta_text: row.cta_text ?? "",
    cta_link: row.cta_link ?? "",
    about_title: row.about_title ?? "",
    about_description: row.about_description ?? "",
  };
}

export function formToUpdatePayload(form: HomepageContentForm) {
  return {
    hero_title: form.hero_title.trim(),
    hero_subtitle: form.hero_subtitle.trim() || null,
    hero_image: form.hero_image?.trim() || null,
    hero_video: form.hero_video?.trim() || null,
    cta_text: form.cta_text.trim(),
    cta_link: form.cta_link.trim(),
    about_title: form.about_title.trim(),
    about_description: form.about_description.trim() || null,
  };
}

function mapSupabaseError(error: { message: string; code?: string }): string {
  if (error.code === "42501" || error.message.toLowerCase().includes("permission")) {
    return "You do not have permission to update homepage content. Please sign in as an admin.";
  }
  if (error.message.toLowerCase().includes("network")) {
    return "Network error. Check your connection and try again.";
  }
  return error.message || "Something went wrong. Please try again.";
}

type SupabaseError = { message: string; code?: string };

type HomepageQuery = {
  select(columns: string): {
    order(column: string, options: { ascending: boolean }): {
      limit(count: number): {
        maybeSingle(): Promise<{ data: HomepageContent | null; error: SupabaseError | null }>;
      };
    };
  };
  insert(row: HomepageContentInsert): {
    select(columns: string): {
      single(): Promise<{ data: HomepageContent | null; error: SupabaseError | null }>;
    };
  };
  update(row: Partial<HomepageContentInsert>): {
    eq(column: string, value: string): {
      select(columns: string): {
        single(): Promise<{ data: HomepageContent | null; error: SupabaseError | null }>;
      };
    };
  };
};

function homepageTable(supabase: NonNullable<ReturnType<typeof createClientIfConfigured>>) {
  return supabase.from("homepage_content") as unknown as HomepageQuery;
}

export async function getOrCreateHomepageContent(): Promise<HomepageContent> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const supabase = createClientIfConfigured();
  if (!supabase) {
    throw new Error("Supabase client could not be initialized.");
  }

  const table = homepageTable(supabase);

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
    .insert(buildDefaultHomepageContent() as HomepageContentInsert)
    .select("*")
    .single();

  if (insertError || !created) {
    throw new Error(mapSupabaseError(insertError ?? { message: "Failed to create default homepage content." }));
  }

  return created;
}

export async function updateHomepageContent(
  id: string,
  form: HomepageContentForm,
): Promise<HomepageContent> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const supabase = createClientIfConfigured();
  if (!supabase) {
    throw new Error("Supabase client could not be initialized.");
  }

  const payload = formToUpdatePayload(form);
  const table = homepageTable(supabase);

  const { data, error } = await table
    .update(payload as Partial<HomepageContentInsert>)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }));
  }

  return data;
}

/**
 * Public read-only fetch for the homepage (no insert, no auth required).
 */
export async function fetchHomepageContentPublic(): Promise<HomepageContent | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createClientIfConfigured();
  if (!supabase) {
    return null;
  }

  const { data, error } = await homepageTable(supabase)
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data;
}

const LOCAL_SECTION_IDS = new Set(["testimonials", "gallery", "footer"]);

export function getLocalHomepageSections(): HomepageSection[] {
  return HOMEPAGE_SECTIONS.filter((section) => LOCAL_SECTION_IDS.has(section.id)).map(
    (section) => ({
      ...section,
      fields: section.fields.map((field) => ({ ...field })),
    }),
  );
}

export function buildSectionsFromForm(form: HomepageContentForm): HomepageSection[] {
  const heroTemplate = HOMEPAGE_SECTIONS.find((section) => section.id === "hero");
  const featuredTemplate = HOMEPAGE_SECTIONS.find((section) => section.id === "featured");

  if (!heroTemplate || !featuredTemplate) {
    throw new Error("Homepage section templates are missing.");
  }

  const hero: HomepageSection = {
    ...heroTemplate,
    fields: heroTemplate.fields.map((field) => {
      if (field.key === "title") return { ...field, value: form.hero_title };
      if (field.key === "subtitle") return { ...field, value: form.hero_subtitle };
      if (field.key === "cta1") return { ...field, value: form.cta_text };
      if (field.key === "cta2") return { ...field, value: form.cta_link };
      return { ...field };
    }),
  };

  const featured: HomepageSection = {
    ...featuredTemplate,
    fields: featuredTemplate.fields.map((field) => {
      if (field.key === "heading") return { ...field, value: form.about_title };
      if (field.key === "subheading") return { ...field, value: form.about_description };
      return { ...field };
    }),
  };

  return [hero, featured];
}

export function patchFormFromField(
  form: HomepageContentForm,
  sectionId: string,
  key: string,
  value: string,
): HomepageContentForm {
  if (sectionId === "hero") {
    if (key === "title") return { ...form, hero_title: value };
    if (key === "subtitle") return { ...form, hero_subtitle: value };
    if (key === "cta1") return { ...form, cta_text: value };
    if (key === "cta2") return { ...form, cta_link: value };
  }

  if (sectionId === "featured") {
    if (key === "heading") return { ...form, about_title: value };
    if (key === "subheading") return { ...form, about_description: value };
  }

  return form;
}
