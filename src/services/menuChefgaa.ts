import type { MenuCategory, MenuData, MenuItem } from "../types/menu";
import type { LocationId } from "../config/locations";

/**
 * Live menu integration with Chefgaa's ordering platform.
 *
 * Two distinct backend APIs are in play, keyed by location:
 * - "legacy" (South Plainfield, Oak Tree): api.chefgaa.com/menu-item
 *   Auth: `outlet` + `partner` headers. Flat array of categories, each
 *   with a `menuItems` array. Prices in `selling_price`. No image URLs
 *   (image field is an opaque token, not usable directly) and no
 *   veg/halal flags.
 * - "chf2" (Lawrenceville): chf2-customer-api.chefgaa.com
 *   Auth: `store-id` + `tenant-id` headers. Nested
 *   `data[0].categories[].items[]`. Prices in `sellingPrice`. Has real
 *   `imageUrl`s and a `vegetarianIndicator`.
 */

type ChefgaaLocationConfig =
  | {
      kind: "legacy";
      url: string;
      outlet: string;
      partner: string;
    }
  | {
      kind: "chf2";
      url: string;
      storeId: string;
      tenantId: string;
    };

const CHEFGAA_CONFIG: Record<LocationId, ChefgaaLocationConfig> = {
  "south-plainfield": {
    kind: "legacy",
    url: "https://api.chefgaa.com/menu-item",
    outlet: "70",
    partner: "1",
  },
  "oak-tree": {
    kind: "legacy",
    url: "https://api.chefgaa.com/menu-item",
    outlet: "71",
    partner: "1",
  },
  lawrenceville: {
    kind: "chf2",
    // NOTE: confirm this URL has no stray characters (the curl the team
    // supplied had a trailing %27). Verify against a fresh curl if this 404s.
    url: "https://chf2-customer-api.chefgaa.com/api/v1/public/menu/platforms/2a4b9791-a69d-4325-8f0e-2fb345479084",
    storeId: "b8e4c76f-0534-47e8-952f-495e60959158",
    tenantId: "bc3e7543-c8d6-4d77-bd87-d30cda29ca51",
  },
};

// ---------- Legacy shape (South Plainfield / Oak Tree) ----------

interface LegacyMenuItem {
  name: string;
  OutletMenuItem: number;
  selling_price: number;
  image: string | null;
  description: string | null;
  is_customizable: boolean;
  mark_as_unavailable: boolean;
  item_available_in_store: boolean;
}

interface LegacyCategory {
  name: string;
  OutletMenuItemCategory: number;
  sort_order: number | null;
  menuItems: LegacyMenuItem[];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeLegacyMenu(raw: LegacyCategory[]): MenuData {
  const categories: MenuCategory[] = raw
    .map((cat, catIndex) => {
      const items: MenuItem[] = cat.menuItems
        // item_available_in_store === false means hidden/out of stock;
        // mark_as_unavailable is inconsistent in this API (true appears on
        // both available and unavailable items) so we rely on
        // item_available_in_store as the source of truth.
        .filter((item) => item.item_available_in_store !== false)
        .map((item) => ({
          id: String(item.OutletMenuItem),
          name: item.name.trim(),
          description: item.description?.trim() ?? "",
          price: item.selling_price,
          category: cat.name.trim(),
          categorySlug: slugify(cat.name),
          featured: false,
          // The legacy API's `image` field is an opaque token, not a
          // fetchable URL — omit rather than render a broken image.
          image: null,
          veg: undefined,
          popular: false,
          chefSpecial: false,
          spiceLevel: null,
          available: true,
        }));

      return {
        id: String(cat.OutletMenuItemCategory),
        name: cat.name.trim(),
        rawName: cat.name.trim(),
        itemCount: items.length,
        image: null,
        items,
        _sortOrder: cat.sort_order ?? catIndex,
      };
    })
    .filter((cat) => cat.items.length > 0)
    .sort((a, b) => a._sortOrder - b._sortOrder)
    .map(({ _sortOrder, ...cat }) => cat);

  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);

  return {
    generatedAt: new Date().toISOString(),
    source: "chefgaa-legacy",
    totalItems,
    categories,
  };
}

// ---------- chf2 shape (Lawrenceville) ----------

interface Chf2Item {
  id: string;
  name: string;
  description: string | null;
  sellingPrice: number;
  imageUrl: string | null;
  vegetarianIndicator: boolean;
  recommended: boolean;
  bestSeller: boolean;
  inStock: boolean;
  status: string;
}

interface Chf2Category {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  status: string;
  items: Chf2Item[];
}

interface Chf2Response {
  success: boolean;
  data: Array<{ categories: Chf2Category[] }>;
}

function normalizeChf2Menu(raw: Chf2Response): MenuData {
  const rawCategories = raw.data?.[0]?.categories ?? [];

  const categories: MenuCategory[] = rawCategories
    .filter((cat) => cat.status === "active")
    .map((cat) => {
      const items: MenuItem[] = cat.items
        .filter((item) => item.status === "active" && item.inStock !== false)
        .map((item) => ({
          id: item.id,
          name: item.name.trim(),
          description: item.description?.trim() ?? "",
          price: item.sellingPrice,
          category: cat.name.trim(),
          categorySlug: slugify(cat.name),
          featured: item.bestSeller,
          image: item.imageUrl || null,
          veg: item.vegetarianIndicator,
          popular: item.recommended,
          chefSpecial: item.bestSeller,
          spiceLevel: null,
          available: true,
        }));

      return {
        id: cat.id,
        name: cat.name.trim(),
        rawName: cat.name.trim(),
        itemCount: items.length,
        image: cat.imageUrl || null,
        items,
        _sortOrder: cat.sortOrder ?? 0,
      };
    })
    .filter((cat) => cat.items.length > 0)
    .sort((a, b) => a._sortOrder - b._sortOrder)
    .map(({ _sortOrder, ...cat }) => cat);

  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);

  return {
    generatedAt: new Date().toISOString(),
    source: "chefgaa-chf2",
    totalItems,
    categories,
  };
}

// ---------- Fetch entry point ----------

export async function fetchChefgaaMenuData(locationId: LocationId): Promise<MenuData | null> {
  const config = CHEFGAA_CONFIG[locationId];
  if (!config) return null;

  try {
    if (config.kind === "legacy") {
      const response = await fetch(config.url, {
        headers: {
          Accept: "application/json, text/plain, */*",
          outlet: config.outlet,
          partner: config.partner,
        },
      });
      if (!response.ok) throw new Error(`Chefgaa legacy API returned ${response.status}`);
      const json = (await response.json()) as LegacyCategory[];
      return normalizeLegacyMenu(json);
    }

    const response = await fetch(config.url, {
      headers: {
        accept: "application/json, text/plain, */*",
        "store-id": config.storeId,
        "tenant-id": config.tenantId,
        "x-platform": "online-ordering",
      },
    });
    if (!response.ok) throw new Error(`Chefgaa chf2 API returned ${response.status}`);
    const json = (await response.json()) as Chf2Response;
    return normalizeChf2Menu(json);
  } catch (err) {
    // Swallow and let the caller fall back to static/cached menu data.
    // eslint-disable-next-line no-console
    console.error(`[menuChefgaa] Failed to fetch menu for ${locationId}:`, err);
    return null;
  }
}