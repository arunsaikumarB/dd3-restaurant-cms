import { useEffect, useRef, useState } from "react";
import { DEFAULT_PUBLIC_LOCATION_ID } from "../config/locations";
import type { GallerySectionKey } from "../config/gallerySections";
import { useLocationSelection } from "../context/LocationContext";
import type { PublicGalleryItem } from "../data/publicGallery";
import { getGallerySectionFallback } from "../data/gallerySectionFallbacks";
import { loadGallerySection } from "../services/galleryPublic";

export function useGallerySection(
  section: GallerySectionKey | string,
  fallback?: PublicGalleryItem[],
): PublicGalleryItem[] {
  const { selectedLocationId } = useLocationSelection();
  const locationId = selectedLocationId ?? DEFAULT_PUBLIC_LOCATION_ID;
  const resolvedFallback = fallback ?? getGallerySectionFallback(section);
  const fallbackRef = useRef(resolvedFallback);
  fallbackRef.current = resolvedFallback;
  const [items, setItems] = useState<PublicGalleryItem[]>(resolvedFallback);

  useEffect(() => {
    let cancelled = false;

    void loadGallerySection(section, locationId).then((loaded) => {
      if (cancelled) return;
      setItems(loaded.length > 0 ? loaded : fallbackRef.current);
    });

    return () => {
      cancelled = true;
    };
  }, [section, locationId]);

  return items;
}

export function useSectionImage(
  section: GallerySectionKey | string,
  fallbackUrl: string,
): string {
  const items = useGallerySection(section);
  return items[0]?.image ?? fallbackUrl;
}
