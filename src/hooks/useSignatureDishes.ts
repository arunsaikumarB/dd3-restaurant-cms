import { useEffect, useMemo, useState } from "react";
import { resolvePublicLocationId, type LocationId } from "../config/locations";
import { SIGNATURE_DISHES, type SignatureDish } from "../data/signatureDishes";
import {
  fetchPublicSignatureDishes,
  staticSignatureDishesForLocation,
} from "../services/signaturePublic";

function resolveFallbackDishes(locationId: LocationId): SignatureDish[] {
  const staticDishes = staticSignatureDishesForLocation(locationId);
  return staticDishes.length > 0 ? staticDishes : SIGNATURE_DISHES;
}

/**
 * Returns the chef's-special dishes for the carousel. Prefers live database
 * content for the active location and falls back to location static data.
 */
export function useSignatureDishes(locationId: LocationId | null) {
  const resolvedLocationId = useMemo(
    () => resolvePublicLocationId(locationId),
    [locationId],
  );
  const [dishes, setDishes] = useState<SignatureDish[]>(() =>
    resolveFallbackDishes(resolvePublicLocationId(locationId)),
  );
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
          setDishes(resolveFallbackDishes(resolvedLocationId));
          setError("Unable to load signature dishes from the database.");
          return;
        }
        setDishes(
          result.length > 0
            ? result
            : resolveFallbackDishes(resolvedLocationId),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setDishes(resolveFallbackDishes(resolvedLocationId));
        setError("Unable to load signature dishes from the database.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedLocationId]);

  return useMemo(
    () => ({ dishes, loading, error, locationId: resolvedLocationId }),
    [dishes, loading, error, resolvedLocationId],
  );
}
