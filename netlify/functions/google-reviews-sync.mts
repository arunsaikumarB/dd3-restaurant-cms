import { runGoogleReviewsSync } from "../../src/integrations/googleReviews/sync";

export default async function handler() {
  try {
    const results = await runGoogleReviewsSync();
    return {
      statusCode: 200,
      body: JSON.stringify(results),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
    };
  }
}

// Weekly: 3 locations x (up to 6 review pages + 1 rating-stats lookup)
// = 21 Serper credits/run worst case, ~90/month — inside the free
// 100/month quota with headroom.
export const config = {
  schedule: "0 8 * * 1",
};
