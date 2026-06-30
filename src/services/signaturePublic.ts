import type { LocationId } from "../config/locations";
import type { SignatureDish } from "../data/signatureDishes";
import {
  resolveChefGaaCategory,
  resolveChefGaaItem,
} from "../data/chefgaaNameMap";
import { fetchPublicMenuItems } from "./menuItems";

/** Max chef's-special dishes shown in the homepage carousel. */
const MAX_SIGNATURE_DISHES = 28;

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

/**
 * Loads chef's-special dishes for a location from the database, mapped to the
 * SignatureDish shape used by the homepage carousel. Returns null when Supabase
 * is unavailable or the query fails so callers can fall back to static data.
 */
export async function fetchPublicSignatureDishes(
  locationId: LocationId,
): Promise<SignatureDish[] | null> {
  const rows = await fetchPublicMenuItems(locationId);
  if (!rows) {
    return null;
  }

  return rows
    .filter((row) => row.chefSpecial && row.status === "active")
    .slice(0, MAX_SIGNATURE_DISHES)
    .map((row) => {
      const category = row.category || "Chef's Special";
      return {
        id: row.id,
        name: row.name,
        category,
        category_name: resolveChefGaaCategory(category),
        item_name: resolveChefGaaItem(row.name),
        price: row.price,
        image: pickImage(row.image, category, row.name),
        badge: "Chef's Special",
      };
    });
}
