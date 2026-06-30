import { useEffect, useState } from "react";
import { loadPublicMenuData } from "../services/menuPublic";
import type { MenuData } from "../types/menu";
import { resolvePublicLocationId, type LocationId } from "../config/locations";

export function useMenuData(locationId: LocationId | null) {
  const [data, setData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const resolvedLocationId = resolvePublicLocationId(locationId);

    void loadPublicMenuData(resolvedLocationId).then((result) => {
      if (cancelled) return;
      setData(result.data);
      setError(result.error);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [locationId]);

  return { data, loading, error };
}
