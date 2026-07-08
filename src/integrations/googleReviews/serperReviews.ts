/**
 * Fetches Google Maps reviews for a single place via Serper.dev's /reviews
 * endpoint, paginating with `nextPageToken` (Serper ignores a `page` number —
 * the token from each response must be echoed back on the next request, and
 * `sortBy` must stay identical across pages or the token is invalidated).
 */

const SERPER_REVIEWS_URL = "https://google.serper.dev/reviews";
const SERPER_PLACES_URL = "https://google.serper.dev/places";

/** Quota guard: each page costs 1 Serper credit against the free 100/month plan. */
const MAX_PAGES_PER_LOCATION = 6;
const TARGET_REVIEW_COUNT = 20;

type SerperReviewUser = {
  name?: string;
};

type SerperReview = {
  id?: string;
  rating?: number;
  snippet?: string;
  isoDate?: string;
  user?: SerperReviewUser;
};

type SerperReviewsResponse = {
  reviews?: SerperReview[];
  nextPageToken?: string;
};

export type FilteredGoogleReview = {
  googleReviewId: string;
  authorName: string;
  rating: number;
  reviewText: string;
  reviewTime: string;
};

function isFiveStarWithText(review: SerperReview): review is Required<Pick<SerperReview, "id" | "rating" | "snippet" | "isoDate">> & SerperReview {
  return (
    review.rating === 5 &&
    typeof review.snippet === "string" &&
    review.snippet.trim().length > 0 &&
    typeof review.id === "string" &&
    typeof review.isoDate === "string"
  );
}

async function fetchReviewsPage(
  apiKey: string,
  placeId: string,
  nextPageToken: string | undefined,
): Promise<SerperReviewsResponse> {
  const response = await fetch(SERPER_REVIEWS_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      placeId,
      sortBy: "newest",
      ...(nextPageToken ? { nextPageToken } : {}),
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Serper reviews request failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<SerperReviewsResponse>;
}

/** Fetches up to TARGET_REVIEW_COUNT 5-star reviews with text, newest first. */
export async function fetchFiveStarReviewsWithText(
  apiKey: string,
  placeId: string,
): Promise<FilteredGoogleReview[]> {
  const collected: FilteredGoogleReview[] = [];
  let nextPageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES_PER_LOCATION; page++) {
    const data = await fetchReviewsPage(apiKey, placeId, nextPageToken);
    const reviews = data.reviews ?? [];

    for (const review of reviews) {
      if (!isFiveStarWithText(review)) continue;
      collected.push({
        googleReviewId: review.id,
        authorName: review.user?.name?.trim() || "Google User",
        rating: review.rating,
        reviewText: review.snippet.trim(),
        reviewTime: review.isoDate,
      });
      if (collected.length >= TARGET_REVIEW_COUNT) return collected;
    }

    if (!data.nextPageToken) break;
    nextPageToken = data.nextPageToken;
  }

  return collected;
}

type SerperPlace = {
  rating?: number;
  ratingCount?: number;
};

type SerperPlacesResponse = {
  places?: SerperPlace[];
};

export type PlaceRatingStats = {
  rating: number;
  ratingCount: number;
};

/**
 * Looks up a place's aggregate Google rating + total review count via
 * Serper's /places search. Serper has no placeId-lookup for this endpoint —
 * it only accepts a text query — so callers pass a query built from the
 * location's own name + address for a precise, reproducible match.
 */
export async function fetchPlaceRatingStats(
  apiKey: string,
  query: string,
): Promise<PlaceRatingStats | null> {
  const response = await fetch(SERPER_PLACES_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Serper places request failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as SerperPlacesResponse;
  const place = data.places?.[0];

  if (!place || typeof place.rating !== "number" || typeof place.ratingCount !== "number") {
    return null;
  }

  return { rating: place.rating, ratingCount: place.ratingCount };
}
