import type { LocationId } from "../config/locations";
import type { SignatureDish } from "../data/signatureDishes";
import {
  resolveChefGaaCategory,
  resolveChefGaaItem,
} from "../data/chefgaaNameMap";
import { createClientIfConfigured } from "../lib/supabase/client";
import { isSupabaseConfigured } from "../lib/supabase/env";
import type { MenuItem } from "../types/database";

/** Max chef's-special dishes shown in the homepage carousel. */
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
const DEFAULT_SHOWCASE_IMAGE = "/showcase/biryani.jpg";

function pickImage(image: string | null, category: string, name: string): string {
  if (image && image.trim()) return image;
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
    image: pickImage(row.image, category, row.name),
    badge: "Chef's Special",
  };
}

/**
 * Loads chef's-special dishes for a location from the database, mapped to the
 * SignatureDish shape used by the homepage carousel. Returns null when Supabase
 * is unavailable or the query fails so callers can fall back to static data.
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
    .eq("chef_special", true)
    .eq("status", "active")
    .order("display_order", { ascending: true })
    .limit(MAX_SIGNATURE_DISHES);

  if (error) {
    return null;
  }

  return (data as MenuItemJoinRow[]).map((row) =>
    mapRowToSignatureDish(row, locationId),
  );
}
