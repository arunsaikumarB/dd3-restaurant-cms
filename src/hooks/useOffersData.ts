import { useEffect, useState } from "react";
import { fetchPublicOffersData, type PublicOffer } from "../services/offersPublic";
import type { LocationId } from "../config/locations";

export function useOffersData(locationId: LocationId | null) {
  const [offers, setOffers] = useState<PublicOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!locationId) {
      setOffers([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    void fetchPublicOffersData(locationId)
      .then((data) => {
        if (cancelled) return;
        setOffers(data);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setOffers([]);
        setError(err instanceof Error ? err.message : "Failed to load offers.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locationId]);

  return { offers, loading, error };
}
