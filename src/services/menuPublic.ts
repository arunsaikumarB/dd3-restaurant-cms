import type { MenuCategory as DbMenuCategory } from "../types/database";
import type { MenuCategory, MenuData, MenuItem } from "../types/menu";
import { fetchPublicMenuCategories } from "./menuCategories";
import { fetchPublicMenuItems, type MenuItemTableRow } from "./menuItems";
import { applyLocationToMenu, type LocationId } from "../config/locations";
import { getStaticMenuForLocation } from "../data/menu";

const CACHE_TTL_MS = 60_000;

let cachedByLocation: Partial<Record<LocationId, MenuData>> = {};
let cacheExpiresAtByLocation: Partial<Record<LocationId, number>> = {};
const inflightByLocation: Partial<Record<LocationId, Promise<MenuData>>> = {};

async function resolveMenuData(locationId: LocationId): Promise<MenuData> {
  const supabaseData = await fetchSupabaseMenuData(locationId);
  if (supabaseData && supabaseData.categories.length > 0) {
    return applyLocationToMenu(supabaseData, locationId);
  }

  const staticMenu = getStaticMenuForLocation(locationId);
  if (staticMenu) {
    return staticMenu;
  }

  const fallback = await fetchFallbackMenuData();
  return applyLocationToMenu(fallback, locationId);
}

export async function fetchPublicMenuData(locationId: LocationId): Promise<MenuData> {
  const now = Date.now();
  const cachedLocation = cachedByLocation[locationId];
  const cacheExpiresAt = cacheExpiresAtByLocation[locationId] ?? 0;
  if (cachedLocation && now < cacheExpiresAt) {
    return cachedLocation;
  }

  const inflight = inflightByLocation[locationId];
  if (inflight) {
    return inflight;
  }

  const request = (async () => {
    try {
      const menu = await resolveMenuData(locationId);
      cachedByLocation[locationId] = menu;
      cacheExpiresAtByLocation[locationId] = Date.now() + CACHE_TTL_MS;
      return menu;
    } catch {
      const staticMenu = getStaticMenuForLocation(locationId);
      if (staticMenu) {
        cachedByLocation[locationId] = staticMenu;
        cacheExpiresAtByLocation[locationId] = Date.now() + CACHE_TTL_MS;
        return staticMenu;
      }

      const fallback = await fetchFallbackMenuData();
      const menu = applyLocationToMenu(fallback, locationId);
      cachedByLocation[locationId] = menu;
      cacheExpiresAtByLocation[locationId] = Date.now() + CACHE_TTL_MS;
      return menu;
    } finally {
      delete inflightByLocation[locationId];
    }
  })();

  inflightByLocation[locationId] = request;
  return request;
}
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

async function fetchSupabaseMenuData(locationId: LocationId): Promise<MenuData | null> {
  const [categories, items] = await Promise.all([
    fetchPublicMenuCategories(locationId),
    fetchPublicMenuItems(locationId),
  ]);

  if (!categories || !items) {
    return null;
  }

  return buildMenuData(categories, items);
}


export type PublicMenuDataResult = {
  data: MenuData | null;
  error: string | null;
};

export async function loadPublicMenuData(locationId: LocationId): Promise<PublicMenuDataResult> {
  try {
    const data = await fetchPublicMenuData(locationId);
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to load menu.",
    };
  }
}
