import { PUBLIC_GALLERY_FALLBACK, type PublicGalleryItem } from "../data/publicGallery";
import type { GalleryImage } from "../types/database";
import type { GallerySectionKey } from "../config/gallerySections";
import {
  fetchFeaturedGallery,
  fetchGalleryBySection,
  fetchPublicGalleryImages,
} from "./gallery";

export type { GallerySectionKey as GallerySection };
export type { PublicGalleryItem };

const CACHE_TTL_MS = 60_000;

let cachedGallery: PublicGalleryItem[] | null = null;
let cacheExpiresAt = 0;
let inflightRequest: Promise<PublicGalleryItem[]> | null = null;

const sectionCache = new Map<string, { expiresAt: number; items: PublicGalleryItem[] }>();
const sectionInflight = new Map<string, Promise<PublicGalleryItem[]>>();

function mapPublicGalleryItem(row: GalleryImage): PublicGalleryItem {
  const altText = row.alt_text?.trim() ?? "";
  const caption = row.caption?.trim() ?? "";
  const title = row.title?.trim() ?? "";

  return {
    id: row.id,
    image: row.image,
    alt_text: altText,
    title,
    caption,
    category: row.category?.trim() ?? "",
    featured: row.featured ?? false,
    display_order: row.display_order,
    section: row.section ?? "general",
    location_id: row.location_id ?? "all",
    page: row.page ?? "home",
  };
}

function sortPublicGallery(rows: PublicGalleryItem[]): PublicGalleryItem[] {
  return [...rows].sort((a, b) => {
    if (a.featured !== b.featured) {
      return a.featured ? -1 : 1;
    }
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order;
    }
    return a.id.localeCompare(b.id);
  });
}

export function getPublicGalleryFallback(): PublicGalleryItem[] {
  return sortPublicGallery(PUBLIC_GALLERY_FALLBACK);
}

export function toGalleryGridImages(items: PublicGalleryItem[]): {
  id: string;
  src: string;
  alt: string;
}[] {
  return items.map((item) => ({
    id: item.id,
    src: item.image,
    alt: item.alt_text || item.title || item.caption || item.category || "Gallery image",
  }));
}

async function fetchSupabasePublicGallery(): Promise<PublicGalleryItem[] | null> {
  const rows = await fetchPublicGalleryImages();
  if (!rows) {
    return null;
  }

  const visible = rows
    .filter((row) => row.visible)
    .map((row) => mapPublicGalleryItem(row));

  return sortPublicGallery(visible);
}

export async function fetchPublicGalleryData(): Promise<PublicGalleryItem[]> {
  const now = Date.now();
  if (cachedGallery && now < cacheExpiresAt) {
    return cachedGallery;
  }

  if (inflightRequest) {
    return inflightRequest;
  }

  inflightRequest = (async () => {
    try {
      const supabaseGallery = await fetchSupabasePublicGallery();
      if (supabaseGallery !== null && supabaseGallery.length > 0) {
        cachedGallery = supabaseGallery;
        cacheExpiresAt = Date.now() + CACHE_TTL_MS;
        return supabaseGallery;
      }

      const fallback = getPublicGalleryFallback();
      cachedGallery = fallback;
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      return fallback;
    } catch {
      const fallback = getPublicGalleryFallback();
      cachedGallery = fallback;
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      return fallback;
    } finally {
      inflightRequest = null;
    }
  })();

  return inflightRequest;
}

export type PublicGalleryResult = {
  items: PublicGalleryItem[];
  error: string | null;
};

export async function loadPublicGalleryData(): Promise<PublicGalleryResult> {
  try {
    const items = await fetchPublicGalleryData();
    return { items, error: null };
  } catch (err) {
    return {
      items: getPublicGalleryFallback(),
      error: err instanceof Error ? err.message : "Failed to load gallery.",
    };
  }
}

function sectionCacheKey(section: string, locationId: string): string {
  return `${section}:${locationId}`;
}

export async function loadGallerySection(
  section: GallerySectionKey | string,
  locationId: string,
): Promise<PublicGalleryItem[]> {
  const cacheKey = sectionCacheKey(section, locationId);
  const now = Date.now();
  const cached = sectionCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return cached.items;
  }

  const inflight = sectionInflight.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const request = (async () => {
    try {
      const rows = await fetchGalleryBySection(section, locationId);
      const items = sortPublicGallery(rows.map(mapPublicGalleryItem));
      sectionCache.set(cacheKey, { items, expiresAt: Date.now() + CACHE_TTL_MS });
      return items;
    } catch {
      return [];
    } finally {
      sectionInflight.delete(cacheKey);
    }
  })();

  sectionInflight.set(cacheKey, request);
  return request;
}

export async function fetchSectionImages(
  section: GallerySectionKey | string,
  locationId: string,
): Promise<PublicGalleryItem[]> {
  return loadGallerySection(section, locationId);
}

export async function fetchSectionImage(
  section: GallerySectionKey | string,
  locationId: string,
): Promise<string | null> {
  const items = await loadGallerySection(section, locationId);
  return items[0]?.image ?? null;
}

export async function loadFeaturedGallery(locationId: string): Promise<PublicGalleryItem[]> {
  try {
    const rows = await fetchFeaturedGallery(locationId);
    return sortPublicGallery(rows.map(mapPublicGalleryItem));
  } catch {
    return [];
  }
}

export function invalidateGallerySectionCache(): void {
  sectionCache.clear();
  sectionInflight.clear();
  cachedGallery = null;
  cacheExpiresAt = 0;
}
