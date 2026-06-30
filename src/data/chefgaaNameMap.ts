/**
 * Maps our database menu names to ChefGaa's exact catalog names for deep-linked
 * order URLs. The carousel order links use these values so a click lands on the
 * correct ChefGaa item/category.
 *
 * Left-hand side  = our value (category slug / DB item name).
 * Right-hand side = the EXACT name in the ChefGaa catalog.
 *
 * Defaults below are identity mappings (same name). If a ChefGaa name differs,
 * change only the right-hand value — no code changes needed. Unmapped names fall
 * back to the raw DB value automatically.
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

/** Category slug (menu_categories.slug) -> ChefGaa category name. */
export const CHEFGAA_CATEGORY_MAP: Record<string, string> = {
  soups: "Soups",
  "vegetarian-appetizers": "Vegetarian Appetizers",
  "non-vegetarian-appetizers": "Non Vegetarian Appetizers",
  breakfast: "Breakfast",
  "kebab-tandooris": "Kebab and Tandoori",
  "naans-breads": "Naans & Breads",
  "vegetarian-entrees": "Vegetarian Entrees",
  "non-vegetarian-entrees": "Non Vegetarian Entrees",
  "vegetarian-rice-biryani": "Vegetarian Rice & Biryani",
  "non-veg-biryani": "Non Veg Biryani",
  "dd-special-mandi": "DD Special Mandi",
  "dd-specials": "DD Specials",
  "dd-family-packs": "DD Family Packs",
  "indo-chinese": "Indo Chinese",
  snacks: "Snacks",
  "chai-coffee": "Chai & Coffee",
  "soft-drinks": "Soft Drinks",
  "kids-menu": "Kids Menu",
  desserts: "Desserts",
  "thali-cooker-pulav": "Thali & Cooker Pulav",
};

/** DB item name (menu_items.name) -> ChefGaa item name. Covers all 28 chef specials. */
export const CHEFGAA_ITEM_MAP: Record<string, string> = {
  // Vegetarian Appetizers
  "Paneer 555": "Paneer 555",
  "Gobi 555": "Gobi 555",
  "Baby Corn 555": "Baby Corn 555",
  "Mushroom 555": "Mushroom 555",
  "Paneer Majestic": "Paneer Majestic",
  "Gobi Majestic": "Gobi Majestic",
  "Mushroom Majestic": "Mushroom Majestic",
  "Baby Corn Majestic": "Baby Corn Majestic",
  // Non-Vegetarian Appetizers
  "Chicken Majestic": "Chicken Majestic",
  "Chicken 555": "Chicken 555",
  "DD Spl Cilantro Fish": "DD Spl Cilantro Fish",
  "Shrimp Majestic": "Shrimp Majestic",
  // Kebab & Tandooris
  "DD Spl Non Veg Kebab Platter": "DD Spl Non Veg Kebab Platter",
  // Non-Vegetarian Entrees
  "DD Chef's Special Chicken Curry (Homestyle)":
    "DD Chef's Special Chicken Curry (Homestyle)",
  "DD Chef's Special Mutton Curry (Homestyle)":
    "DD Chef's Special Mutton Curry (Homestyle)",
  // Non-Veg Biryani
  "DD Special Chicken Biryani (Bone-In)": "DD Special Chicken Biryani (Bone-In)",
  "DD Special Chicken Biryani (Boneless)":
    "DD Special Chicken Biryani (Boneless)",
  "DD Spl Natu Kodi Biryani": "DD Spl Natu Kodi Biryani",
  "DD Spl Nalli Gosht Biryani": "DD Spl Nalli Gosht Biryani",
  // DD Special Mandi
  "DD Special Nalli Gosht Mandi (Single)":
    "DD Special Nalli Gosht Mandi (Single)",
  "DD Special Nalli Gosht Mandi (Half)": "DD Special Nalli Gosht Mandi (Half)",
  "DD Special Nalli Gosht Mandi (Full)": "DD Special Nalli Gosht Mandi (Full)",
  // DD Specials
  "DD Chef's Special Tawa Fish (Bone-In)":
    "DD Chef's Special Tawa Fish (Bone-In)",
  "DD Chef's Special Tawa Fish (Boneless)":
    "DD Chef's Special Tawa Fish (Boneless)",
  "DD Spl Potlam Biryani": "DD Spl Potlam Biryani",
  // DD Family Packs
  "DD Spl Chicken Biryani Family Pack": "DD Spl Chicken Biryani Family Pack",
  // Chai & Coffee
  "DD Spl Filter Coffee": "DD Spl Filter Coffee",
  // Desserts
  "DD Special Sweet": "DD Special Sweet",
};

/** Slugifies a category name to match menu_categories.slug values. */
export function toCategorySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Resolves the ChefGaa category name from a DB category display name. */
export function resolveChefGaaCategory(categoryName: string): string {
  const slug = toCategorySlug(categoryName);
  return CHEFGAA_CATEGORY_MAP[slug] ?? categoryName;
}

/** Resolves the ChefGaa item name from a DB item name. */
export function resolveChefGaaItem(itemName: string): string {
  return CHEFGAA_ITEM_MAP[itemName] ?? itemName;
}
