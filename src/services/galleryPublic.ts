import { PUBLIC_GALLERY_FALLBACK, type PublicGalleryItem } from "../data/publicGallery";
import type { GalleryImage } from "../types/database";
import { fetchPublicGalleryImages } from "./gallery";

export type { PublicGalleryItem };

const CACHE_TTL_MS = 60_000;

let cachedGallery: PublicGalleryItem[] | null = null;
let cacheExpiresAt = 0;
let inflightRequest: Promise<PublicGalleryItem[]> | null = null;

function mapPublicGalleryItem(row: GalleryImage): PublicGalleryItem {
  const altText = row.alt_text?.trim() ?? "";
  const caption = row.caption?.trim() ?? "";

  return {
    id: row.id,
    image: row.image,
    alt_text: altText,
    caption,
    category: row.category?.trim() ?? "",
    featured: row.featured ?? false,
    display_order: row.display_order,
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
    alt: item.alt_text || item.caption || item.category || "Gallery image",
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
