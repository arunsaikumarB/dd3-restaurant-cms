import { createClient } from "@supabase/supabase-js";
import { LOCATIONS, LOCATION_IDS, type LocationId } from "../../config/locations";
import type { Database, GoogleRatingStatsInsert, GoogleReviewInsert } from "../../types/database";
import { fetchFiveStarReviewsWithText, fetchPlaceRatingStats } from "./serperReviews";

/** Builds a precise, reproducible /places search query for a location. */
function buildPlaceQuery(address: string): string {
  return `Desi Dhamaka ${address.replace(/\s*\n\s*/g, ", ")}`.replace(/\s+/g, " ").trim();
}

function readEnv(key: string): string {
  return process.env[key]?.trim() ?? "";
}

function getSupabaseClient() {
  const url = readEnv("VITE_SUPABASE_URL") || readEnv("SUPABASE_URL");
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceKey) {
    throw new Error("Supabase is not configured on the server.");
  }

  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type GoogleReviewsSyncResult = Record<
  LocationId,
  { synced: number; rating?: number; ratingCount?: number; error?: string }
>;

/** Syncs 5-star Google reviews with text for every location into Supabase. */
export async function runGoogleReviewsSync(): Promise<GoogleReviewsSyncResult> {
  const apiKey = readEnv("SERPER_API_KEY");
  if (!apiKey) {
    throw new Error("SERPER_API_KEY is not configured.");
  }

  const supabase = getSupabaseClient();
  const results = {} as GoogleReviewsSyncResult;

  for (const locationId of LOCATION_IDS) {
    const location = LOCATIONS[locationId];
    try {
      const reviews = await fetchFiveStarReviewsWithText(apiKey, location.googlePlaceId);

      if (reviews.length > 0) {
        const rows: GoogleReviewInsert[] = reviews.map((review) => ({
          location_id: locationId,
          google_review_id: review.googleReviewId,
          author_name: review.authorName,
          rating: review.rating,
          review_text: review.reviewText,
          review_time: review.reviewTime,
          source: "Google Review",
        }));

        const { error } = await (
          supabase.from("google_reviews") as unknown as {
            upsert(
              rows: GoogleReviewInsert[],
              options: { onConflict: string },
            ): Promise<{ error: { message: string } | null }>;
          }
        ).upsert(rows, { onConflict: "location_id,google_review_id" });

        if (error) throw new Error(error.message);
      }

      const ratingStats = await fetchPlaceRatingStats(apiKey, buildPlaceQuery(location.address));

      if (ratingStats) {
        const statsRow: GoogleRatingStatsInsert = {
          location_id: locationId,
          rating: ratingStats.rating,
          rating_count: ratingStats.ratingCount,
        };

        const { error: statsError } = await (
          supabase.from("google_rating_stats") as unknown as {
            upsert(
              row: GoogleRatingStatsInsert,
              options: { onConflict: string },
            ): Promise<{ error: { message: string } | null }>;
          }
        ).upsert(statsRow, { onConflict: "location_id" });

        if (statsError) throw new Error(statsError.message);
      }

      results[locationId] = {
        synced: reviews.length,
        rating: ratingStats?.rating,
        ratingCount: ratingStats?.ratingCount,
      };
    } catch (err) {
      results[locationId] = {
        synced: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  return results;
}
