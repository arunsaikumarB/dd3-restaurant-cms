import { PUBLIC_REVIEWS_FALLBACK, type PublicReview } from "../data/publicReviews";
import type { Review } from "../types/database";
import { fetchPublicReviews } from "./reviews";

export type { PublicReview };

const CACHE_TTL_MS = 60_000;
const DEFAULT_SOURCE = "Google Review";

let cachedReviews: PublicReview[] | null = null;
let cacheExpiresAt = 0;
let inflightRequest: Promise<PublicReview[]> | null = null;

function formatReviewDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function mapPublicReview(row: Review): PublicReview {
  return {
    id: row.id,
    name: row.customer_name,
    text: row.review,
    rating: row.rating,
    source: DEFAULT_SOURCE,
    featured: row.featured ?? false,
    created_at: row.created_at,
  };
}

function sortPublicReviews(rows: PublicReview[]): PublicReview[] {
  return [...rows].sort((a, b) => {
    if (a.featured !== b.featured) {
      return a.featured ? -1 : 1;
    }
    return b.created_at.localeCompare(a.created_at);
  });
}

export function getPublicReviewsFallback(): PublicReview[] {
  return sortPublicReviews(PUBLIC_REVIEWS_FALLBACK);
}

async function fetchSupabasePublicReviews(): Promise<PublicReview[] | null> {
  const rows = await fetchPublicReviews();
  if (!rows) {
    return null;
  }

  const approved = rows
    .filter((row) => row.approved)
    .map(mapPublicReview);

  return sortPublicReviews(approved);
}

export async function fetchPublicReviewsData(): Promise<PublicReview[]> {
  const now = Date.now();
  if (cachedReviews && now < cacheExpiresAt) {
    return cachedReviews;
  }

  if (inflightRequest) {
    return inflightRequest;
  }

  inflightRequest = (async () => {
    try {
      const supabaseReviews = await fetchSupabasePublicReviews();
      if (supabaseReviews !== null) {
        cachedReviews = supabaseReviews;
        cacheExpiresAt = Date.now() + CACHE_TTL_MS;
        return supabaseReviews;
      }

      const fallback = getPublicReviewsFallback();
      cachedReviews = fallback;
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      return fallback;
    } catch {
      const fallback = getPublicReviewsFallback();
      cachedReviews = fallback;
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      return fallback;
    } finally {
      inflightRequest = null;
    }
  })();

  return inflightRequest;
}

export type PublicReviewsResult = {
  reviews: PublicReview[];
  error: string | null;
};

export async function loadPublicReviewsData(): Promise<PublicReviewsResult> {
  try {
    const reviews = await fetchPublicReviewsData();
    return { reviews, error: null };
  } catch (err) {
    return {
      reviews: getPublicReviewsFallback(),
      error: err instanceof Error ? err.message : "Failed to load reviews.",
    };
  }
}

export function formatPublicReviewDate(review: PublicReview): string {
  return formatReviewDate(review.created_at);
}
