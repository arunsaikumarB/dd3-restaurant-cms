import { useEffect, useState } from "react";
import {
  getPublicOffersFallback,
  loadPublicOffersData,
  type PublicOffer,
} from "../services/offersPublic";

export function useOffersData() {
  const [offers, setOffers] = useState<PublicOffer[]>(() => getPublicOffersFallback());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void loadPublicOffersData().then((result) => {
      if (cancelled) return;
      setOffers(result.offers);
      setError(result.error);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { offers, loading, error };
}
