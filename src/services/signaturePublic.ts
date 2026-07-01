import type { LocationId } from "../config/locations";
import type { SignatureDish } from "../data/signatureDishes";
import { getStaticMenuForLocation } from "../data/menu";
import {
  resolveChefGaaCategory,
  resolveChefGaaItem,
} from "../data/chefgaaNameMap";
import { createClientIfConfigured } from "../lib/supabase/client";
import { isSupabaseConfigured } from "../lib/supabase/env";
import type { MenuItem } from "../types/database";

/** Minimum dishes shown in the carousel when the catalog allows it. */
export const SIGNATURE_MIN_COUNT = 6;

/** Max signature dishes shown in the homepage carousel. */
const MAX_SIGNATURE_DISHES = 28;

type MenuItemJoinRow = MenuItem & {
  menu_categories: { name: string } | null;
};

/** Showcase images used when a menu item has no uploaded image yet. */
const SHOWCASE_FALLBACKS: { match: string; image: string }[] = [
  { match: "biryani", image: "/showcase/biryani.jpg" },
  { match: "mandi", image: "/showcase/mandi.jpg" },
  { match: "tandoor", image: "/showcase/tandoori.jpg" },
  { match: "kebab", image: "/showcase/tandoori.jpg" },
  { match: "tikka", image: "/showcase/tandoori.jpg" },
  { match: "chinese", image: "/showcase/indo-chinese.jpg" },
  { match: "manchur", image: "/showcase/indo-chinese.jpg" },
  { match: "chilli", image: "/showcase/indo-chinese.jpg" },
  { match: "paneer", image: "/showcase/butter-chicken.jpg" },
  { match: "chicken", image: "/showcase/butter-chicken.jpg" },
];
export const DEFAULT_SHOWCASE_IMAGE = "/showcase/biryani.jpg";

function normalizeImageUrl(image: string | null | undefined): string | null {
  if (!image?.trim()) return null;
  const trimmed = image.trim();
  if (
    trimmed === "null" ||
    trimmed === "undefined" ||
    trimmed === "N/A" ||
    trimmed === "none"
  ) {
    return null;
  }
  return trimmed;
}

/** Picks a valid image URL or a premium showcase fallback for the dish. */
export function pickSignatureImage(
  image: string | null | undefined,
  category: string,
  name: string,
): string {
  const normalized = normalizeImageUrl(image);
  if (normalized) return normalized;
  const haystack = `${category} ${name}`.toLowerCase();
  const found = SHOWCASE_FALLBACKS.find((entry) => haystack.includes(entry.match));
  return found?.image ?? DEFAULT_SHOWCASE_IMAGE;
}

function mapRowToSignatureDish(
  row: MenuItemJoinRow,
  locationId: LocationId,
): SignatureDish {
  const category = row.menu_categories?.name ?? "Chef's Special";
  return {
    id: row.id,
    name: row.name,
    category,
    category_name: resolveChefGaaCategory(category, locationId),
    item_name: resolveChefGaaItem(row.name, locationId),
    price: Number(row.price),
    image: pickSignatureImage(row.image, category, row.name),
    badge: row.chef_special
      ? "Chef's Special"
      : row.popular
        ? "Popular"
        : undefined,
  };
}

type SelectableRow = {
  id: string;
  chef_special: boolean;
  popular: boolean;
  display_order: number;
};

/** Priority: chef_special → popular → remaining items by display order. */
export function selectSignatureDishes<T extends SelectableRow>(
  rows: T[],
  map: (row: T) => SignatureDish,
): SignatureDish[] {
  const sorted = [...rows].sort((a, b) => a.display_order - b.display_order);
  const chef = sorted.filter((row) => row.chef_special);
  const popular = sorted.filter((row) => row.popular && !row.chef_special);
  const rest = sorted.filter((row) => !row.popular && !row.chef_special);

  const seen = new Set<string>();
  const result: SignatureDish[] = [];

  const add = (row: T) => {
    if (seen.has(row.id) || result.length >= MAX_SIGNATURE_DISHES) return;
    seen.add(row.id);
    result.push(map(row));
  };

  for (const row of chef) add(row);

  if (result.length < SIGNATURE_MIN_COUNT) {
    for (const row of popular) {
      add(row);
      if (result.length >= SIGNATURE_MIN_COUNT) break;
    }
  }

  if (result.length < SIGNATURE_MIN_COUNT) {
    for (const row of rest) {
      add(row);
      if (result.length >= SIGNATURE_MIN_COUNT) break;
    }
  }

  return result;
}

/**
 * Loads signature dishes for a location from the database. Returns null when
 * Supabase is unavailable or the query fails so callers can fall back to static data.
 */
export async function fetchPublicSignatureDishes(
  locationId: LocationId,
): Promise<SignatureDish[] | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createClientIfConfigured();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("menu_items")
    .select("*, menu_categories ( name )")
    .eq("location_id", locationId)
    .eq("imported_from_chefgaa", true)
    .eq("status", "active")
    .order("display_order", { ascending: true })
    .limit(500);

  if (error) {
    return null;
  }

  return selectSignatureDishes(data as MenuItemJoinRow[], (row) =>
    mapRowToSignatureDish(row, locationId),
  );
}

/** Location-specific static fallback when live data is unavailable. */
export function staticSignatureDishesForLocation(
  locationId: LocationId,
): SignatureDish[] {
  const menu = getStaticMenuForLocation(locationId);
  if (!menu) return [];

  type StaticRow = SelectableRow & {
    name: string;
    price: number;
    image?: string | null;
    categoryName: string;
  };

  const rows: StaticRow[] = menu.categories.flatMap((category) =>
    category.items.map((item) => ({
      id: `${locationId}-${item.name}`,
      name: item.name,
      price: item.price,
      image: item.image,
      categoryName: category.name,
      chef_special: Boolean(item.chefSpecial),
      popular: Boolean(item.popular),
      display_order: 0,
    })),
  );

  return selectSignatureDishes(rows, (row) => ({
    id: row.id,
    name: row.name,
    category: row.categoryName,
    category_name: resolveChefGaaCategory(row.categoryName, locationId),
    item_name: resolveChefGaaItem(row.name, locationId),
    price: row.price,
    image: pickSignatureImage(row.image ?? null, row.categoryName, row.name),
    badge: row.chef_special
      ? "Chef's Special"
      : row.popular
        ? "Popular"
        : undefined,
  }));
}
