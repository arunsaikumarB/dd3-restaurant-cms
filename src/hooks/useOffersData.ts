import { useEffect, useState } from "react";
import {
  getPublicOffersFallback,
  loadPublicOffersData,
  type PublicOffer,
} from "../services/offersPublic";
import type { LocationId } from "../config/locations";

export function useOffersData(locationId: LocationId | null) {
  const [offers, setOffers] = useState<PublicOffer[]>(() =>
    getPublicOffersFallback(locationId ?? "lawrenceville"),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const resolvedLocation = locationId ?? "lawrenceville";
    setLoading(true);

    void loadPublicOffersData(resolvedLocation).then((result) => {
      if (cancelled) return;
      setOffers(result.offers);
      setError(result.error);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [locationId]);

  return { offers, loading, error };
}
