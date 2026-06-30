/** ChefGaa online ordering base URL for Desi Dhamaka Lawrenceville. */
export const ORDER_MENU_BASE =
  "https://orders.chefgaa.com/store/desi-dhamaka/menu";

/** Generic menu link (order page "Order Direct" button). */
export const ORDER_DIRECT_URL = ORDER_MENU_BASE;

/**
 * ChefGaa URL query parameter names for deep linking.
 * Update only this map if the platform changes its link format.
 */
export const CHEFGAA_DEEP_LINK_PARAMS = {
  category: "category_name",
  item: "item_name",
  /** Catalog UUID — used when ChefGaa supports opening a specific item modal. */
  itemId: "item_id",
} as const;

export interface ChefGaaDeepLinkOptions {
  /** Optional catalog UUID for item-level deep linking when supported. */
  itemId?: string;
}

/** Target for featured homepage dishes that link to ChefGaa. */
export interface ChefGaaFeaturedTarget {
  category_name: string;
  item_name: string;
}

/**
 * Builds a ChefGaa menu URL with category and item deep-link params.
 * Category and item names must match the ChefGaa menu exactly.
 */
export function buildChefGaaMenuUrl(
  categoryName: string,
  itemName: string,
  options?: ChefGaaDeepLinkOptions,
): string {
  const url = new URL(ORDER_MENU_BASE);
  const category = categoryName.trim();
  const item = itemName.trim();

  if (category) {
    url.searchParams.set(CHEFGAA_DEEP_LINK_PARAMS.category, category);
  }
  if (item) {
    url.searchParams.set(CHEFGAA_DEEP_LINK_PARAMS.item, item);
  }
  if (options?.itemId?.trim()) {
    url.searchParams.set(CHEFGAA_DEEP_LINK_PARAMS.itemId, options.itemId.trim());
  }

  return url.toString();
}

/** Builds a location-specific ChefGaa order URL, optionally deep-linking to a category. */
export function buildLocationOrderMenuUrl(
  orderMenuBase: string,
  categoryName?: string | null,
  itemName?: string,
): string {
  const url = new URL(orderMenuBase);
  const category = categoryName?.trim() ?? "";
  const item = itemName?.trim() ?? "";

  if (category) {
    url.searchParams.set(CHEFGAA_DEEP_LINK_PARAMS.category, category);
  }
  if (item) {
    url.searchParams.set(CHEFGAA_DEEP_LINK_PARAMS.item, item);
  }

  return url.toString();
}

/**
 * Opens the ChefGaa menu in a new tab, deep-linking to the given category
 * and item when the platform supports those query parameters.
 */
export function navigateToChefGaa(
  categoryName: string,
  itemName: string,
  options?: ChefGaaDeepLinkOptions,
): void {
  const url = buildChefGaaMenuUrl(categoryName, itemName, options);
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Shared attributes for external ChefGaa links. */
export const EXTERNAL_ORDER_LINK_PROPS = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;
