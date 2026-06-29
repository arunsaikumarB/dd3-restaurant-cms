import { createClientIfConfigured } from "../lib/supabase/client";
import { isSupabaseConfigured } from "../lib/supabase/env";
import type { ContentStatus, MenuItem, MenuItemInsert } from "../types/database";
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
  };
}

export function formToPayload(form: MenuItemForm): MenuItemInsert {
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
  };
}

function mapJoinRow(row: MenuItemJoinRow): MenuItemTableRow {
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
  };
}

type SupabaseError = { message: string; code?: string };

type MenuItemsQuery = {
  select(columns: string): {
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
  insert(row: MenuItemInsert): {
    select(columns: string): {
      single(): Promise<{ data: MenuItemJoinRow | null; error: SupabaseError | null }>;
    };
  };
  update(row: Partial<MenuItemInsert>): {
    eq(column: string, value: string): {
      select(columns: string): {
        single(): Promise<{ data: MenuItemJoinRow | null; error: SupabaseError | null }>;
      };
    };
  };
  delete(): {
    eq(column: string, value: string): Promise<{ error: SupabaseError | null }>;
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

export async function fetchMenuItems(): Promise<MenuItemTableRow[]> {
  const supabase = requireClient();
  const { data, error } = await menuItemsTable(supabase)
    .select(MENU_ITEM_SELECT)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(mapSupabaseError(error, "load menu items"));
  }

  return (data ?? []).map(mapJoinRow);
}

export async function createMenuItem(form: MenuItemForm): Promise<MenuItemTableRow> {
  const supabase = requireClient();
  const { data, error } = await menuItemsTable(supabase)
    .insert(formToPayload(form))
    .select(MENU_ITEM_SELECT)
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Create failed." }, "create menu item"));
  }

  return mapJoinRow(data);
}

export async function updateMenuItem(id: string, form: MenuItemForm): Promise<MenuItemTableRow> {
  const supabase = requireClient();
  const { data, error } = await menuItemsTable(supabase)
    .update(formToPayload(form))
    .eq("id", id)
    .select(MENU_ITEM_SELECT)
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }, "update menu item"));
  }

  return mapJoinRow(data);
}

export async function updateMenuItemStatus(
  id: string,
  status: ContentStatus,
): Promise<MenuItemTableRow> {
  const supabase = requireClient();
  const { data, error } = await menuItemsTable(supabase)
    .update({ status })
    .eq("id", id)
    .select(MENU_ITEM_SELECT)
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error ?? { message: "Update failed." }, "update menu item status"));
  }

  return mapJoinRow(data);
}

export async function deleteMenuItem(id: string): Promise<void> {
  const supabase = requireClient();
  const { error } = await menuItemsTable(supabase).delete().eq("id", id);

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
