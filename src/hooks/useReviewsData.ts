import { useEffect, useState } from "react";
import { useLocationSelection } from "../context/LocationContext";
import { resolvePublicLocationId } from "../config/locations";
import {
  getPublicReviewsFallback,
  loadPublicReviewsData,
  type PublicReview,
} from "../services/reviewsPublic";

export function useReviewsData() {
  const { selectedLocationId } = useLocationSelection();
  const locationId = resolvePublicLocationId(selectedLocationId);
  const [reviews, setReviews] = useState<PublicReview[]>(() => getPublicReviewsFallback());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void loadPublicReviewsData(locationId).then((result) => {
      if (cancelled) return;
      setReviews(result.reviews);
      setError(result.error);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [locationId]);

  return { reviews, loading, error };
}
