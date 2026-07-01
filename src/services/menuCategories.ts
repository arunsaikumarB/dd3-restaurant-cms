import { createClientIfConfigured } from "../lib/supabase/client";
import { isSupabaseConfigured } from "../lib/supabase/env";
import type { LocationId } from "../config/locations";
import { getLocationConfig, LOCATION_IDS } from "../config/locations";
import type { ContentStatus, MenuCategory, MenuCategoryInsert } from "../types/database";
import { LocationScopeError } from "../utils/supabase/locationScope";
import { mapSupabaseError } from "../utils/supabase/errors";
import { resolveCategorySlug } from "../utils/validation/menuCategories";

export type MenuCategoryForm = {
  name: string;
  slug: string;
  image: string | null;
  display_order: number;
  status: ContentStatus;
};

export type MenuCategoryWithCount = MenuCategory & {
  itemCount: number;
  locationName?: string;
};

export const EMPTY_MENU_CATEGORY_FORM: MenuCategoryForm = {
  name: "",
  slug: "",
  image: null,
  display_order: 0,
  status: "active",
};

export function rowToForm(row: MenuCategory): MenuCategoryForm {
  return {
    name: row.name,
    slug: row.slug,
    image: row.image,
    display_order: row.display_order,
    status: row.status,
  };
}

export function formToPayload(form: MenuCategoryForm, locationId: LocationId): MenuCategoryInsert {
  return {
    location_id: locationId,
    name: form.name.trim(),
    slug: resolveCategorySlug(form.name, form.slug),
    image: form.image?.trim() || null,
    display_order: Math.round(form.display_order),
    status: form.status,
  };
}

function formToUpdatePayload(form: MenuCategoryForm) {
  return {
    name: form.name.trim(),
    slug: resolveCategorySlug(form.name, form.slug),
    image: form.image?.trim() || null,
    display_order: Math.round(form.display_order),
    status: form.status,
  };
}

export class CategoryDeleteBlockedError extends Error {
  constructor() {
    super("This category contains menu items. Please move or delete them first.");
    this.name = "CategoryDeleteBlockedError";
  }
}

type SupabaseError = { message: string; code?: string };

type CategoriesQuery = {
  select(columns: string): {
    eq(column: string, value: string): {
      order(column: string, options: { ascending: boolean }): Promise<{
        data: MenuCategory[] | null;
        error: SupabaseError | null;
      }>;
    };
  };
  insert(row: MenuCategoryInsert): {
    select(columns: string): {
      single(): Promise<{ data: MenuCategory | null; error: SupabaseError | null }>;
    };
  };
  update(row: ReturnType<typeof formToUpdatePayload> | { status: ContentStatus }): {
    eq(column: string, value: string): {
      eq(column: string, value: string): {
        select(columns: string): {
          single(): Promise<{ data: MenuCategory | null; error: SupabaseError | null }>;
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

type MenuItemsQuery = {
  select(columns: string): {
    eq(column: string, value: string): Promise<{
      data: { category_id: string }[] | null;
      error: SupabaseError | null;
    }>;
  };
  select(
    columns: string,
    options: { count: "exact"; head: true },
  ): {
    eq(column: string, value: string): {
      eq(column: string, value: string): Promise<{ count: number | null; error: SupabaseError | null }>;
    };
  };
};

type SlugQuery = {
  select(columns: string): {
    eq(column: string, value: string): {
      eq(column: string, value: string): {
        neq(column: string, value: string): {
          maybeSingle(): Promise<{ data: { id: string } | null; error: SupabaseError | null }>;
        };
        maybeSingle(): Promise<{ data: { id: string } | null; error: SupabaseError | null }>;
      };
    };
  };
};

function categoriesTable(supabase: NonNullable<ReturnType<typeof createClientIfConfigured>>) {
  return supabase.from("menu_categories") as unknown as CategoriesQuery;
}

function menuItemsTable(supabase: NonNullable<ReturnType<typeof createClientIfConfigured>>) {
  return supabase.from("menu_items") as unknown as MenuItemsQuery;
}

function slugTable(supabase: NonNullable<ReturnType<typeof createClientIfConfigured>>) {
  return supabase.from("menu_categories") as unknown as SlugQuery;
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

function aggregateItemCounts(rows: { category_id: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }
  return counts;
}

export async function fetchMenuCategories(locationId: LocationId): Promise<MenuCategoryWithCount[]> {
  const supabase = requireClient();
  const categories = categoriesTable(supabase);
  const items = menuItemsTable(supabase);

  const [{ data: categoryRows, error: categoryError }, { data: itemRows, error: itemError }] =
    await Promise.all([
      categories.select("*").eq("location_id", locationId).order("display_order", { ascending: true }),
      items.select("category_id").eq("location_id", locationId),
    ]);

  if (categoryError) {
    throw new Error(mapSupabaseError(categoryError, "load categories"));
  }
  if (itemError) {
    throw new Error(mapSupabaseError(itemError, "load categories"));
  }

  const counts = aggregateItemCounts(itemRows ?? []);

  return (categoryRows ?? []).map((row) => ({
    ...row,
    itemCount: counts.get(row.id) ?? 0,
  }));
}

export async function fetchAllMenuCategories(): Promise<MenuCategoryWithCount[]> {
  const results = await Promise.all(
    LOCATION_IDS.map(async (locationId) => {
      const rows = await fetchMenuCategories(locationId);
      const locationName = getLocationConfig(locationId).shortName;
      return rows.map((row) => ({ ...row, locationName }));
    }),
  );
  return results.flat();
}

/**
 * Public read-only fetch for the menu page (active categories only via RLS).
 */
export async function fetchPublicMenuCategories(
  locationId: LocationId,
): Promise<MenuCategory[] | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createClientIfConfigured();
  if (!supabase) {
    return null;
  }

  const { data, error } = await (
    categoriesTable(supabase) as unknown as {
      select(columns: string): {
        eq(column: string, value: string): {
          eq(column: string, value: boolean): {
            order(
              column: string,
              options: { ascending: boolean },
            ): Promise<{ data: MenuCategory[] | null; error: SupabaseError | null }>;
          };
        };
      };
    }
  )
    .select("*")
    .eq("location_id", locationId)
    .eq("imported_from_chefgaa", true)
    .order("display_order", { ascending: true });

  if (error) {
    return null;
  }

  return data ?? [];
}

export async function isSlugTaken(
  slug: string,
  locationId: LocationId,
  excludeId?: string,
): Promise<boolean> {
  const supabase = requireClient();
  const table = slugTable(supabase);
  const normalized = slug.trim();

  const query = table.select("id").eq("slug", normalized).eq("location_id", locationId);
  const { data, error } = excludeId
    ? await query.neq("id", excludeId).maybeSingle()
    : await query.maybeSingle();

  if (error) {
    throw new Error(mapSupabaseError(error, "check slug availability"));
  }

  return Boolean(data);
}

export async function createMenuCategory(
  form: MenuCategoryForm,
  locationId: LocationId,
): Promise<MenuCategory> {
  const supabase = requireClient();
  const payload = formToPayload(form, locationId);

  const { data, error } = await categoriesTable(supabase)
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Create failed." }, "create category"));
  }

  return data;
}

export async function updateMenuCategory(
  id: string,
  form: MenuCategoryForm,
  locationId: LocationId,
): Promise<MenuCategory> {
  const supabase = requireClient();

  const { data, error } = await categoriesTable(supabase)
    .update(formToUpdatePayload(form))
    .eq("id", id)
    .eq("location_id", locationId)
    .select("*")
    .single();

  if (error?.code === "PGRST116" || (!error && !data)) {
    throw new LocationScopeError();
  }
  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }, "update category"));
  }

  return data;
}

export async function updateMenuCategoryStatus(
  id: string,
  status: ContentStatus,
  locationId: LocationId,
): Promise<MenuCategory> {
  const supabase = requireClient();

  const { data, error } = await categoriesTable(supabase)
    .update({ status })
    .eq("id", id)
    .eq("location_id", locationId)
    .select("*")
    .single();

  if (error?.code === "PGRST116" || (!error && !data)) {
    throw new LocationScopeError();
  }
  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }, "update category status"));
  }

  return data;
}

export async function deleteMenuCategory(id: string, locationId: LocationId): Promise<void> {
  const supabase = requireClient();

  const { count, error: countError } = await menuItemsTable(supabase)
    .select("*", { count: "exact", head: true })
    .eq("category_id", id)
    .eq("location_id", locationId);

  if (countError) {
    throw new Error(mapSupabaseError(countError, "delete category"));
  }

  if ((count ?? 0) > 0) {
    throw new CategoryDeleteBlockedError();
  }

  const { error } = await categoriesTable(supabase).delete().eq("id", id).eq("location_id", locationId);
  if (error) {
    throw new Error(mapSupabaseError(error, "delete category"));
  }
}
