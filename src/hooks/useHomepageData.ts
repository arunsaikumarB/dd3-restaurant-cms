import { useEffect, useState } from "react";
import {
  fetchHomepageBundle,
  getHomepageFallbacks,
  type HomepageBundle,
} from "../services/homepagePublic";
import { useLocationSelection } from "../context/LocationContext";
import type { LocationId } from "../config/locations";

export function useHomepageData() {
  const { selectedLocationId } = useLocationSelection();
  const resolvedLocationId: LocationId = selectedLocationId ?? "lawrenceville";
  const [bundle, setBundle] = useState<HomepageBundle>(() =>
    getHomepageFallbacks(resolvedLocationId),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsRefreshing(true);
      try {
        const data = await fetchHomepageBundle(resolvedLocationId);
        if (!cancelled) {
          setBundle(data);
        }
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [resolvedLocationId]);

  return { bundle, isRefreshing, locationId: resolvedLocationId };
}
