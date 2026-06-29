import { useEffect, useState } from "react";
import {
  fetchHomepageBundle,
  getHomepageFallbacks,
  type HomepageBundle,
} from "../services/homepagePublic";

export function useHomepageData() {
  const [bundle, setBundle] = useState<HomepageBundle>(() => getHomepageFallbacks());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsRefreshing(true);
      try {
        const data = await fetchHomepageBundle();
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
  }, []);

  return { bundle, isRefreshing };
}
