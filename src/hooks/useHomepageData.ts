import { useEffect, useState } from "react";
import {
  fetchHomepageBundle,
  getHomepageFallbacks,
  type HomepageBundle,
} from "../services/homepagePublic";
import { useLocationSelection } from "../context/LocationContext";

export function useHomepageData() {
  const [bundle, setBundle] = useState<HomepageBundle>(() => getHomepageFallbacks());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { selectedLocation } = useLocationSelection();

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

  const locationAwareBundle: HomepageBundle = selectedLocation
    ? {
        ...bundle,
        settings: {
          ...bundle.settings,
          phone: selectedLocation.phone,
          email: selectedLocation.email,
          address: selectedLocation.address,
          google_maps: selectedLocation.googleMapsEmbed,
          opening_hours: selectedLocation.openingHours,
        },
      }
    : bundle;

  return { bundle: locationAwareBundle, isRefreshing };
}
