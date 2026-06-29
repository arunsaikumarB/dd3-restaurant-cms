import { useEffect, useState } from "react";
import {
  getPublicReviewsFallback,
  loadPublicReviewsData,
  type PublicReview,
} from "../services/reviewsPublic";

export function useReviewsData() {
  const [reviews, setReviews] = useState<PublicReview[]>(() => getPublicReviewsFallback());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void loadPublicReviewsData().then((result) => {
      if (cancelled) return;
      setReviews(result.reviews);
      setError(result.error);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { reviews, loading, error };
}
