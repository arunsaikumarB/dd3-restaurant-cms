import { createClientIfConfigured } from "../lib/supabase/client";
import { isSupabaseConfigured } from "../lib/supabase/env";
import { getLocationConfig, LOCATION_IDS, type LocationId } from "../config/locations";
import type { ContentStatus, MenuItem, MenuItemInsert } from "../types/database";
import { LocationScopeError } from "../utils/supabase/locationScope";
import { mapSupabaseError } from "../utils/supabase/errors";

export type MenuItemForm = {
  category_id: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  veg: boolean;
  popular: boolean;
  chef_special: boolean;
  spice_level: number | null;
  status: ContentStatus;
  display_order: number;
  /** When true, the ChefGaa sync leaves this item untouched entirely (all fields). */
  manual_override: boolean;
};

export type MenuItemTableRow = {
  id: string;
  category_id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  veg: boolean;
  vegType: "veg" | "non-veg";
  popular: boolean;
  chefSpecial: boolean;
  spice_level: number | null;
  status: ContentStatus;
  display_order: number;
  created_at: string;
  location_id?: LocationId;
  locationName?: string;
  importedFromChefGaa: boolean;
  manualOverride: boolean;
};

type MenuItemJoinRow = MenuItem & {
  menu_categories: { name: string } | null;
};

export const EMPTY_MENU_ITEM_FORM: MenuItemForm = {
  category_id: "",
  name: "",
  description: "",
  price: 0,
  image: null,
  veg: false,
  popular: false,
  chef_special: false,
  spice_level: null,
  status: "active",
  display_order: 0,
  manual_override: false,
};

export function rowToForm(row: MenuItemTableRow): MenuItemForm {
  return {
    category_id: row.category_id,
    name: row.name,
    description: row.description,
    price: row.price,
    image: row.image,
    veg: row.veg,
    popular: row.popular,
    chef_special: row.chefSpecial,
    spice_level: row.spice_level,
    status: row.status === "draft" ? "inactive" : row.status,
    display_order: row.display_order,
    manual_override: row.manualOverride,
  };
}

function formToUpdatePayload(form: MenuItemForm) {
  return {
    category_id: form.category_id,
    name: form.name.trim(),
    description: form.description.trim() || null,
    price: form.price,
    image: form.image?.trim() || null,
    veg: form.veg,
    popular: form.popular,
    chef_special: form.chef_special,
    spice_level: form.spice_level,
    status: form.status === "draft" ? "inactive" : form.status,
    display_order: Math.round(form.display_order),
    manual_override: form.manual_override,
  };
}

export function formToPayload(form: MenuItemForm, locationId: LocationId): MenuItemInsert {
  return {
    location_id: locationId,
    ...formToUpdatePayload(form),
  };
}

function mapJoinRow(row: MenuItemJoinRow, locationId?: LocationId): MenuItemTableRow {
  return {
    id: row.id,
    category_id: row.category_id,
    category: row.menu_categories?.name ?? "Unknown",
    name: row.name,
    description: row.description ?? "",
    price: Number(row.price),
    image: row.image,
    veg: row.veg,
    vegType: row.veg ? "veg" : "non-veg",
    popular: row.popular,
    chefSpecial: row.chef_special,
    spice_level: row.spice_level,
    status: row.status,
    display_order: row.display_order,
    created_at: row.created_at,
    location_id: row.location_id ?? locationId,
    locationName: locationId ? getLocationConfig(locationId).shortName : undefined,
    importedFromChefGaa: row.imported_from_chefgaa ?? false,
    manualOverride: row.manual_override ?? false,
  };
}

type SupabaseError = { message: string; code?: string };

type MenuItemsQuery = {
  select(columns: string): {
    eq(column: string, value: string): {
      order(
        column: string,
        options: { ascending: boolean },
      ): {
        order(
          column: string,
          options: { ascending: boolean },
        ): Promise<{ data: MenuItemJoinRow[] | null; error: SupabaseError | null }>;
      };
    };
  };
  insert(row: MenuItemInsert): {
    select(columns: string): {
      single(): Promise<{ data: MenuItemJoinRow | null; error: SupabaseError | null }>;
    };
  };
  update(row: ReturnType<typeof formToUpdatePayload> | { status: ContentStatus }): {
    eq(column: string, value: string): {
      eq(column: string, value: string): {
        select(columns: string): {
          single(): Promise<{ data: MenuItemJoinRow | null; error: SupabaseError | null }>;
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

const MENU_ITEM_SELECT = "*, menu_categories ( name )";

function menuItemsTable(supabase: NonNullable<ReturnType<typeof createClientIfConfigured>>) {
  return supabase.from("menu_items") as unknown as MenuItemsQuery;
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

export async function fetchMenuItems(locationId: LocationId): Promise<MenuItemTableRow[]> {
  const supabase = requireClient();
  const { data, error } = await menuItemsTable(supabase)
    .select(MENU_ITEM_SELECT)
    .eq("location_id", locationId)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(mapSupabaseError(error, "load menu items"));
  }

  return (data ?? []).map((row) => mapJoinRow(row, locationId));
}

export async function fetchAllMenuItems(): Promise<MenuItemTableRow[]> {
  const results = await Promise.all(
    LOCATION_IDS.map(async (locationId) => {
      const rows = await fetchMenuItems(locationId);
      return rows.map((row) => ({
        ...row,
        location_id: locationId,
        locationName: getLocationConfig(locationId).shortName,
      }));
    }),
  );
  return results.flat();
}

/**
 * Public read-only fetch for the menu page (active items only via RLS).
 * Only ChefGaa-imported rows and manual overrides are exposed publicly.
 */
export async function fetchPublicMenuItems(
  locationId: LocationId,
): Promise<MenuItemTableRow[] | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createClientIfConfigured();
  if (!supabase) {
    return null;
  }

  const { data, error } = await (
    menuItemsTable(supabase) as unknown as {
      select(columns: string): {
        eq(column: string, value: string): {
          or(expression: string): {
            order(
              column: string,
              options: { ascending: boolean },
            ): {
              order(
                column: string,
                options: { ascending: boolean },
              ): Promise<{ data: MenuItemJoinRow[] | null; error: SupabaseError | null }>;
            };
          };
        };
      };
    }
  )
    .select(MENU_ITEM_SELECT)
    .eq("location_id", locationId)
    .or("imported_from_chefgaa.eq.true,manual_override.eq.true")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return null;
  }

  return (data ?? []).map((row) => mapJoinRow(row, locationId));
}

async function assertCategoryInLocation(
  supabase: NonNullable<ReturnType<typeof createClientIfConfigured>>,
  categoryId: string,
  locationId: LocationId,
): Promise<void> {
  const { data, error } = await (
    supabase.from("menu_categories") as unknown as {
      select(columns: string): {
        eq(column: string, value: string): {
          eq(column: string, value: string): {
            maybeSingle(): Promise<{ data: { id: string } | null; error: SupabaseError | null }>;
          };
        };
      };
    }
  )
    .select("id")
    .eq("id", categoryId)
    .eq("location_id", locationId)
    .maybeSingle();

  if (error) {
    throw new Error(mapSupabaseError(error, "validate category"));
  }
  if (!data) {
    throw new LocationScopeError("Category does not belong to the selected location.");
  }
}

export async function createMenuItem(
  form: MenuItemForm,
  locationId: LocationId,
): Promise<MenuItemTableRow> {
  const supabase = requireClient();
  await assertCategoryInLocation(supabase, form.category_id, locationId);

  const { data, error } = await menuItemsTable(supabase)
    .insert(formToPayload(form, locationId))
    .select(MENU_ITEM_SELECT)
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Create failed." }, "create menu item"));
  }

  return mapJoinRow(data, locationId);
}

export async function updateMenuItem(
  id: string,
  form: MenuItemForm,
  locationId: LocationId,
): Promise<MenuItemTableRow> {
  const supabase = requireClient();
  await assertCategoryInLocation(supabase, form.category_id, locationId);

  const { data, error } = await menuItemsTable(supabase)
    .update(formToUpdatePayload(form))
    .eq("id", id)
    .eq("location_id", locationId)
    .select(MENU_ITEM_SELECT)
    .single();

  if (error?.code === "PGRST116" || (!error && !data)) {
    throw new LocationScopeError();
  }
  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }, "update menu item"));
  }

  return mapJoinRow(data, locationId);
}

export async function updateMenuItemStatus(
  id: string,
  status: ContentStatus,
  locationId: LocationId,
): Promise<MenuItemTableRow> {
  const supabase = requireClient();
  const { data, error } = await menuItemsTable(supabase)
    .update({ status })
    .eq("id", id)
    .eq("location_id", locationId)
    .select(MENU_ITEM_SELECT)
    .single();

  if (error?.code === "PGRST116" || (!error && !data)) {
    throw new LocationScopeError();
  }
  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }, "update menu item status"));
  }

  return mapJoinRow(data, locationId);
}

export async function deleteMenuItem(id: string, locationId: LocationId): Promise<void> {
  const supabase = requireClient();
  const { error } = await menuItemsTable(supabase).delete().eq("id", id).eq("location_id", locationId);

  if (error) {
    throw new Error(mapSupabaseError(error, "delete menu item"));
  }
}

export function isMenuItemAvailable(status: ContentStatus): boolean {
  return status === "active";
}

export function availabilityLabel(status: ContentStatus): string {
  return isMenuItemAvailable(status) ? "Available" : "Unavailable";
}

export function toggleAvailabilityStatus(status: ContentStatus): ContentStatus {
  return isMenuItemAvailable(status) ? "inactive" : "active";
}
