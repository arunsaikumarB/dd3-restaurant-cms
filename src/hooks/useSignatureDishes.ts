import { useEffect, useState } from "react";
import type { LocationId } from "../config/locations";
import { SIGNATURE_DISHES, type SignatureDish } from "../data/signatureDishes";
import { fetchPublicSignatureDishes } from "../services/signaturePublic";

/**
 * Returns the chef's-special dishes for the carousel. Prefers live database
 * content for the active location and falls back to the curated static list
 * when the database is empty or unavailable.
 */
export function useSignatureDishes(locationId: LocationId | null) {
  const [dishes, setDishes] = useState<SignatureDish[]>(SIGNATURE_DISHES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void fetchPublicSignatureDishes(locationId ?? "lawrenceville")
      .then((result) => {
        if (cancelled) return;
        setDishes(result && result.length > 0 ? result : SIGNATURE_DISHES);
      })
      .catch(() => {
        if (!cancelled) setDishes(SIGNATURE_DISHES);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locationId]);

  return { dishes, loading };
}
