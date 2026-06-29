import type { MenuCategory as DbMenuCategory } from "../types/database";
import type { MenuCategory, MenuData, MenuItem } from "../types/menu";
import { fetchPublicMenuCategories } from "./menuCategories";
import { fetchPublicMenuItems, type MenuItemTableRow } from "./menuItems";

const CACHE_TTL_MS = 60_000;

let cachedMenu: MenuData | null = null;
let cacheExpiresAt = 0;
let inflightRequest: Promise<MenuData> | null = null;
let inflightFallback: Promise<MenuData> | null = null;

function mapMenuItem(row: MenuItemTableRow, category: DbMenuCategory): MenuItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    category: category.name,
    categorySlug: category.slug,
    featured: row.chefSpecial,
    image: row.image,
    veg: row.veg,
    popular: row.popular,
    chefSpecial: row.chefSpecial,
    spiceLevel: row.spice_level,
    available: row.status === "active",
  };
}

function buildMenuData(
  categories: DbMenuCategory[],
  items: MenuItemTableRow[],
): MenuData {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const rowsByCategory = new Map<string, MenuItemTableRow[]>();

  for (const row of items) {
    if (!categoryById.has(row.category_id)) continue;

    const bucket = rowsByCategory.get(row.category_id) ?? [];
    bucket.push(row);
    rowsByCategory.set(row.category_id, bucket);
  }

  for (const rows of rowsByCategory.values()) {
    rows.sort((a, b) => {
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }
      return a.name.localeCompare(b.name);
    });
  }

  const mappedCategories: MenuCategory[] = categories
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .map((category) => {
      const categoryRows = rowsByCategory.get(category.id) ?? [];
      const categoryItems = categoryRows.map((row) => mapMenuItem(row, category));

      return {
        id: category.id,
        name: category.name,
        rawName: category.name,
        itemCount: categoryItems.length,
        image: category.image,
        items: categoryItems,
      };
    })
    .filter((category) => category.items.length > 0);

  const totalItems = mappedCategories.reduce((sum, category) => sum + category.items.length, 0);

  return {
    generatedAt: new Date().toISOString(),
    source: "supabase",
    totalItems,
    categories: mappedCategories,
  };
}

async function fetchFallbackMenuData(): Promise<MenuData> {
  if (inflightFallback) {
    return inflightFallback;
  }

  inflightFallback = (async () => {
    const response = await fetch("/data/menu.json");
    if (!response.ok) {
      throw new Error("Menu data not found");
    }
    return response.json() as Promise<MenuData>;
  })();

  try {
    return await inflightFallback;
  } finally {
    inflightFallback = null;
  }
}

async function fetchSupabaseMenuData(): Promise<MenuData | null> {
  const [categories, items] = await Promise.all([
    fetchPublicMenuCategories(),
    fetchPublicMenuItems(),
  ]);

  if (!categories || !items) {
    return null;
  }

  return buildMenuData(categories, items);
}

export async function fetchPublicMenuData(): Promise<MenuData> {
  const now = Date.now();
  if (cachedMenu && now < cacheExpiresAt) {
    return cachedMenu;
  }

  if (inflightRequest) {
    return inflightRequest;
  }

  inflightRequest = (async () => {
    try {
      const supabaseData = await fetchSupabaseMenuData();
      if (supabaseData && supabaseData.categories.length > 0) {
        cachedMenu = supabaseData;
        cacheExpiresAt = Date.now() + CACHE_TTL_MS;
        return supabaseData;
      }

      const fallback = await fetchFallbackMenuData();
      cachedMenu = fallback;
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      return fallback;
    } catch {
      const fallback = await fetchFallbackMenuData();
      cachedMenu = fallback;
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      return fallback;
    } finally {
      inflightRequest = null;
    }
  })();

  return inflightRequest;
}

export type PublicMenuDataResult = {
  data: MenuData | null;
  error: string | null;
};

export async function loadPublicMenuData(): Promise<PublicMenuDataResult> {
  try {
    const data = await fetchPublicMenuData();
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to load menu.",
    };
  }
}
