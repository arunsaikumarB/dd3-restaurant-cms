import { slugify } from "../../utils/slug";
import { SYNC_RETRY_ATTEMPTS, SYNC_RETRY_DELAYS_MS, CHEFGAA_IMAGE_CDN_PREFIX } from "./constants";
import type { LegacyMenuCategory, LegacyMenuItem, LegacyOrderTypeAvailability } from "./types";

function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isTransientHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export async function withRetry<T>(
  label: string,
  operation: () => Promise<T>,
  attempts = SYNC_RETRY_ATTEMPTS,
  delays: readonly number[] = SYNC_RETRY_DELAYS_MS,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts) break;
      const delay = delays[Math.min(attempt - 1, delays.length - 1)] ?? delays[delays.length - 1];
      await sleep(delay);
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`${label} failed after ${attempts} attempts: ${message}`);
}

export function slugifyCategoryName(name: string): string {
  return slugify(name) || "category";
}

export function ensureUniqueSlug(baseSlug: string, used: Set<string>): string {
  let candidate = baseSlug;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

export function resolveChefGaaImage(image: string | null | undefined): string | null {
  if (!image || typeof image !== "string") return null;
  const trimmed = image.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `${CHEFGAA_IMAGE_CDN_PREFIX}${trimmed}`;
}

export function isOrderTypeAvailable(
  orderTypes: LegacyOrderTypeAvailability[] | undefined,
  orderTypeId: number,
): boolean {
  if (!orderTypes?.length) return true;
  const match = orderTypes.find((entry) => entry.order_type === orderTypeId);
  return match ? match.available : false;
}

export function isLegacyItemAvailable(item: LegacyMenuItem, orderTypeId: number): boolean {
  if (item.mark_as_unavailable) return false;
  if (item.item_available_in_store === false) return false;
  return isOrderTypeAvailable(item.availability?.order_types, orderTypeId);
}

export function isLegacyCategoryAvailable(
  category: LegacyMenuCategory,
  orderTypeId: number,
): boolean {
  return isOrderTypeAvailable(category.availability?.order_types, orderTypeId);
}

export function inferVeg(categoryName: string, itemName: string): boolean {
  const haystack = `${categoryName} ${itemName}`.toLowerCase();
  if (/\bnon[-\s]?veg/.test(haystack)) return false;
  if (/\b(chicken|mutton|lamb|goat|fish|shrimp|prawn|egg|meat|keema)\b/.test(haystack)) {
    return false;
  }
  if (/\b(veg|vegetarian|paneer|gobi|dal|samosa|naan)\b/.test(haystack)) return true;
  return false;
}

export function inferChefSpecial(name: string): boolean {
  return /\b(chef|special)\b/i.test(name);
}

export function inferSpiceLevel(name: string): number | null {
  const lower = name.toLowerCase();
  if (/\bextra hot|very spicy|phall\b/.test(lower)) return 5;
  if (/\bhot|spicy|chilli|chili|65|555|mirchi\b/.test(lower)) return 4;
  if (/\bmedium\b/.test(lower)) return 3;
  if (/\bmild\b/.test(lower)) return 1;
  return null;
}

export function parsePrice(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.round(numeric * 100) / 100;
}

export function hashCategoryPayload(name: string, displayOrder: number, status: string): string {
  return fnv1aHex(JSON.stringify({ name, displayOrder, status }));
}

export function hashItemPayload(
  item: {
    name: string;
    description: string | null;
    price: number;
    image: string | null;
    veg: boolean;
    popular: boolean;
    chefSpecial: boolean;
    availability: boolean;
    spiceLevel: number | null;
    displayOrder: number;
    categoryId: string;
    status: string;
  },
): string {
  return fnv1aHex(JSON.stringify(item));
}

export function formatSyncSummaryMessage(
  categories: { created: number; updated: number; deactivated: number },
  items: { created: number; updated: number; deactivated: number; pricesChanged: number; failed: number },
): string {
  return [
    `${categories.updated + categories.created} Categories Updated`,
    `${items.updated + items.created} Menu Items Updated`,
    `${items.pricesChanged} Prices Changed`,
    `${items.failed} Failed`,
  ].join("\n");
}
