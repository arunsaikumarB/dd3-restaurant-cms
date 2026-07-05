import { useEffect, useState } from "react";
import type { LocationId } from "../config/locations";
import { buildDefaultSeoMetadataForm } from "../utils/seo/seoDefaults";
import { getPublicSeoMetadata } from "../services/seoMetadataPublic";
import type { SeoMetadataForm, SeoPageKey } from "../types/seoMetadata";

export function useSeoMetadata(locationId: LocationId, pageKey: SeoPageKey | null) {
  const [form, setForm] = useState<SeoMetadataForm | null>(null);
  const [loading, setLoading] = useState(Boolean(pageKey));

  useEffect(() => {
    if (!pageKey) {
      setForm(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void getPublicSeoMetadata(locationId, pageKey)
      .then((data) => {
        if (cancelled) return;
        setForm(data ?? buildDefaultSeoMetadataForm(locationId, pageKey));
      })
      .catch(() => {
        if (cancelled) return;
        setForm(buildDefaultSeoMetadataForm(locationId, pageKey));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locationId, pageKey]);

  return { form, loading };
}
