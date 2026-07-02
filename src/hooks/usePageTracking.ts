import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { DEFAULT_PUBLIC_LOCATION_ID } from "../config/locations";
import { useLocationSelection } from "../context/LocationContext";
import { trackPageView, normalizePagePath } from "../services/analytics";

export function usePageTracking(): void {
  const { pathname } = useLocation();
  const { selectedLocationId } = useLocationSelection();
  const lastTrackedRef = useRef({ path: "", at: 0 });

  useEffect(() => {
    if (import.meta.env.DEV) return;
    if (pathname.startsWith("/admin")) return;

    const now = Date.now();
    if (
      lastTrackedRef.current.path === pathname &&
      now - lastTrackedRef.current.at < 1000
    ) {
      return;
    }

    lastTrackedRef.current = { path: pathname, at: now };
    trackPageView(normalizePagePath(pathname), selectedLocationId ?? DEFAULT_PUBLIC_LOCATION_ID);
  }, [pathname, selectedLocationId]);
}
