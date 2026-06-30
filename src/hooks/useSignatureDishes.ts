import { useEffect, useMemo, useState } from "react";
import { resolvePublicLocationId, type LocationId } from "../config/locations";
import { SIGNATURE_DISHES, type SignatureDish } from "../data/signatureDishes";
import { fetchPublicSignatureDishes } from "../services/signaturePublic";

/**
 * Returns the chef's-special dishes for the carousel. Prefers live database
 * content for the active location and falls back to the curated static list
 * when the database is empty or unavailable.
 */
export function useSignatureDishes(locationId: LocationId | null) {
  const resolvedLocationId = useMemo(
    () => resolvePublicLocationId(locationId),
    [locationId],
  );
  const [dishes, setDishes] = useState<SignatureDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchPublicSignatureDishes(resolvedLocationId)
      .then((result) => {
        if (cancelled) return;
        if (result === null) {
          setDishes(SIGNATURE_DISHES);
          setError("Unable to load signature dishes from the database.");
          return;
        }
        setDishes(result.length > 0 ? result : SIGNATURE_DISHES);
      })
      .catch(() => {
        if (cancelled) return;
        setDishes(SIGNATURE_DISHES);
        setError("Unable to load signature dishes from the database.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedLocationId]);

  return { dishes, loading, error, locationId: resolvedLocationId };
}
