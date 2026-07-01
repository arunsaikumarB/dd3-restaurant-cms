/**
 * Maps our database menu names to ChefGaa's exact catalog names for deep-linked
 * order URLs. Names differ by location — always pass locationId when resolving.
 */

import type { LocationId } from "../config/locations";
import { DEFAULT_PUBLIC_LOCATION_ID } from "../config/locations";

/** Per-location ChefGaa store URLs for online ordering. */
export const ORDER_URLS: Record<LocationId, string> = {
  "south-plainfield":
    "https://order.chefgaa.com/store/desi-dhamaka?order_type=106",
  "oak-tree": "https://order.chefgaa.com/store/desi-dhamaka?order_type=108",
  lawrenceville: "https://orders.chefgaa.com/store/desi-dhamaka/menu",
};

/** Resolves the ChefGaa order URL for a location (falls back to South Plainfield). */
export function getOrderUrl(locationId: LocationId | string | null | undefined): string {
  if (locationId && locationId in ORDER_URLS) {
    return ORDER_URLS[locationId as LocationId];
  }
  return ORDER_URLS[DEFAULT_PUBLIC_LOCATION_ID];
}

const WEBSITE_CATEGORY_MAP = {
  soups: "Soups",
  "vegetarian-appetizers": "Vegetarian Appetizers",
  "non-vegetarian-appetizers": "Non-Vegetarian Appetizers",
  "kebab-and-tandooris": "Kebab & Tandooris",
  "naans-and-breads": "Naans & Breads",
  "vegetarian-entrees": "Vegetarian Entrees",
  "non-vegetarian-entrees": "Non-Vegetarian Entrees",
  "vegetarian-rice-and-biryani": "Vegetarian Rice & Biryani",
  "non-veg-biryani": "Non-Veg Biryani",
  "dd-special-mandi": "DD Special Mandi",
  "dd-specials": "DD Specials",
  "dd-family-packs": "DD Family Packs",
  "indo-chinese": "Indo Chinese",
  snacks: "Snacks",
  "chai-and-coffee": "Chai & Coffee",
  "soft-drinks": "Soft Drinks",
  "kids-menu": "Kids Menu",
  desserts: "Desserts",
  "thali-and-cooker-pulav": "Thali & Cooker Pulav",
  thali: "Thali",
} as const;

/** Category slug (menu_categories.slug) -> ChefGaa category name, per location. */
export const CHEFGAA_CATEGORY_MAP_BY_LOCATION: Record<
  LocationId,
  Record<string, string>
> = {
  "south-plainfield": { ...WEBSITE_CATEGORY_MAP },
  "oak-tree": { ...WEBSITE_CATEGORY_MAP },
  lawrenceville: { ...WEBSITE_CATEGORY_MAP },
};

/**
 * DB category display name -> ChefGaa category name when they differ.
 * Website DB names match the public site; ChefGaa may use alternate labels.
 */
export const CHEFGAA_CATEGORY_DISPLAY_MAP_BY_LOCATION: Partial<
  Record<LocationId, Record<string, string>>
> = {
  "south-plainfield": {
    "Kebab & Tandooris": "Kebab and Tandooris",
    "Naans & Breads": "Naans",
    "Non-Vegetarian Appetizers": "Non-Veg Appetizers",
    "Non-Vegetarian Entrees": "Non-Veg Entrees",
    "Vegetarian Rice & Biryani": "Vegetarian Rice & Biryanis",
    "DD Family Packs": "DD Family Packs (To Go Only)",
    "Chai & Coffee": "Chai",
    "Thali & Cooker Pulav": "Thali",
  },
  "oak-tree": {
    "Kebab & Tandooris": "Kebab and Tandooris",
    "Naans & Breads": "Naans",
    "Non-Vegetarian Appetizers": "Non-Veg Appetizers",
    "Non-Vegetarian Entrees": "Non-Veg Entrees",
    "Vegetarian Rice & Biryani": "Vegetarian Rice & Biryanis",
    "DD Family Packs": "DD Family Packs (To Go Only)",
    "Chai & Coffee": "Chai",
  },
  lawrenceville: {
    "Kebab & Tandooris": "Kebab and Tandoori",
    "Naans & Breads": "Naans",
    "Non-Vegetarian Entrees": "Non Vegetarian Entrees",
    "Non-Vegetarian Appetizers": "Non Vegetarian Appetizers",
    "Vegetarian Rice & Biryani": "Vegetarian Rice & Biryani",
    "Non-Veg Biryani": "Biryani",
    "Chai & Coffee": "Chai",
    "Thali & Cooker Pulav": "Cooker Pulav",
  },
};

/** DB item name -> ChefGaa item name when they differ. Identity by default. */
export const CHEFGAA_ITEM_MAP_BY_LOCATION: Partial<
  Record<LocationId, Record<string, string>>
> = {
  "south-plainfield": {},
  "oak-tree": {},
  lawrenceville: {
    "DD SPL Cilantro Fish": "DD Spl Cilantro Fish",
    "DD SPL Non Veg Kebab Platter": "DD Spl Non Veg Kebab Platter",
    "DD SPL Natu Kodi Biryani": "DD Spl Natu Kodi Biryani",
    "DD SPL Potlam Biryani": "DD Spl Potlam Biryani",
    "DD SPL Chicken Biryani Family Pack": "DD Spl Chicken Biryani Family Pack",
    "DD SPL Filter Coffee": "DD Spl Filter Coffee",
  },
};

/** Slugifies a category name to match menu_categories.slug values. */
export function toCategorySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveLocationCategoryMap(
  locationId: LocationId | string | null | undefined,
): Record<string, string> | null {
  if (locationId && locationId in CHEFGAA_CATEGORY_MAP_BY_LOCATION) {
    return CHEFGAA_CATEGORY_MAP_BY_LOCATION[locationId as LocationId];
  }
  return null;
}

/** Resolves the ChefGaa category name from a DB category display name. */
export function resolveChefGaaCategory(
  categoryName: string,
  locationId?: LocationId | string | null,
): string {
  if (locationId && locationId in CHEFGAA_CATEGORY_DISPLAY_MAP_BY_LOCATION) {
    const displayMap =
      CHEFGAA_CATEGORY_DISPLAY_MAP_BY_LOCATION[locationId as LocationId];
    if (displayMap?.[categoryName]) {
      return displayMap[categoryName];
    }
  }

  const slug = toCategorySlug(categoryName);
  const locationMap = resolveLocationCategoryMap(locationId);
  if (locationMap?.[slug]) {
    return locationMap[slug];
  }

  return categoryName;
}

/** Resolves the ChefGaa item name from a DB item name. */
export function resolveChefGaaItem(
  itemName: string,
  locationId?: LocationId | string | null,
): string {
  if (locationId && locationId in CHEFGAA_ITEM_MAP_BY_LOCATION) {
    const map = CHEFGAA_ITEM_MAP_BY_LOCATION[locationId as LocationId];
    if (map?.[itemName]) {
      return map[itemName];
    }
  }
  return itemName;
}
