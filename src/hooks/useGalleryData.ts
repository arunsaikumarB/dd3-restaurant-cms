import { useEffect, useState } from "react";
import {
  getPublicGalleryFallback,
  loadPublicGalleryData,
  type PublicGalleryItem,
} from "../services/galleryPublic";

export function useGalleryData() {
  const [items, setItems] = useState<PublicGalleryItem[]>(() => getPublicGalleryFallback());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void loadPublicGalleryData().then((result) => {
      if (cancelled) return;
      setItems(result.items);
      setError(result.error);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading, error };
}
