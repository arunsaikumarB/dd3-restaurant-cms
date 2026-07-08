import { createClientIfConfigured } from "../lib/supabase/client";
import type { LocationId } from "../config/locations";
import { PUBLIC_REVIEWS_FALLBACK, type PublicReview } from "../data/publicReviews";
import type { GoogleReview, Review } from "../types/database";
import { fetchPublicReviews } from "./reviews";

export type { PublicReview };

const CACHE_TTL_MS = 60_000;
const DEFAULT_SOURCE = "Google Review";
const GOOGLE_REVIEWS_LIMIT = 20;

const cachedReviewsByLocation = new Map<LocationId, PublicReview[]>();
const cacheExpiresAtByLocation = new Map<LocationId, number>();
const inflightRequestByLocation = new Map<LocationId, Promise<PublicReview[]>>();

function formatReviewDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function mapGoogleReview(row: GoogleReview): PublicReview {
  return {
    id: row.id,
    name: row.author_name,
    text: row.review_text,
    rating: row.rating,
    source: row.source || DEFAULT_SOURCE,
    featured: false,
    created_at: row.review_time,
  };
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

/** Real 5-star Google reviews with text, synced per location by google-reviews-sync.mts. */
async function fetchGoogleReviews(locationId: LocationId): Promise<PublicReview[] | null> {
  const supabase = createClientIfConfigured();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("google_reviews")
    .select("*")
    .eq("location_id", locationId)
    .eq("rating", 5)
    .order("review_time", { ascending: false })
    .limit(GOOGLE_REVIEWS_LIMIT);

  if (error) return null;
  return ((data ?? []) as GoogleReview[])
    .filter((row) => row.review_text.trim().length > 0)
    .map(mapGoogleReview);
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

export async function fetchPublicReviewsData(locationId: LocationId): Promise<PublicReview[]> {
  const now = Date.now();
  const cached = cachedReviewsByLocation.get(locationId);
  const expiresAt = cacheExpiresAtByLocation.get(locationId) ?? 0;
  if (cached && now < expiresAt) {
    return cached;
  }

  const inflight = inflightRequestByLocation.get(locationId);
  if (inflight) {
    return inflight;
  }

  const request = (async () => {
    try {
      const googleReviews = await fetchGoogleReviews(locationId);
      if (googleReviews !== null && googleReviews.length > 0) {
        cachedReviewsByLocation.set(locationId, googleReviews);
        cacheExpiresAtByLocation.set(locationId, Date.now() + CACHE_TTL_MS);
        return googleReviews;
      }

      const manualReviews = await fetchSupabasePublicReviews();
      const result =
        manualReviews !== null && manualReviews.length > 0
          ? manualReviews
          : getPublicReviewsFallback();

      cachedReviewsByLocation.set(locationId, result);
      cacheExpiresAtByLocation.set(locationId, Date.now() + CACHE_TTL_MS);
      return result;
    } catch {
      const fallback = getPublicReviewsFallback();
      cachedReviewsByLocation.set(locationId, fallback);
      cacheExpiresAtByLocation.set(locationId, Date.now() + CACHE_TTL_MS);
      return fallback;
    } finally {
      inflightRequestByLocation.delete(locationId);
    }
  })();

  inflightRequestByLocation.set(locationId, request);
  return request;
}

export type PublicReviewsResult = {
  reviews: PublicReview[];
  error: string | null;
};

export async function loadPublicReviewsData(locationId: LocationId): Promise<PublicReviewsResult> {
  try {
    const reviews = await fetchPublicReviewsData(locationId);
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
