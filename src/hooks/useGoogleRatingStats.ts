import { useEffect, useState } from "react";
import { useLocationSelection } from "../context/LocationContext";
import { resolvePublicLocationId } from "../config/locations";
import { fetchGoogleRatingStats } from "../services/googleRatingPublic";
import type { GoogleRatingStats } from "../types/database";

/** Real Google rating + review count for the active location, null until synced/loaded. */
export function useGoogleRatingStats(): GoogleRatingStats | null {
  const { selectedLocationId } = useLocationSelection();
  const locationId = resolvePublicLocationId(selectedLocationId);
  const [stats, setStats] = useState<GoogleRatingStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetchGoogleRatingStats(locationId).then((result) => {
      if (!cancelled) setStats(result);
    });

    return () => {
      cancelled = true;
    };
  }, [locationId]);

  return stats;
}
