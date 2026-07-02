import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LOCATION_STORAGE_KEY,
  LOCATION_OPTIONS,
  readStoredLocationId,
  type LocationId,
  getLocationConfig,
} from "../config/locations";
import { locPath } from "../utils/locationPaths";

type LocationContextValue = {
  /** The location currently active, mirrored from the URL (`/:locationId/...`). */
  selectedLocationId: LocationId | null;
  selectedLocation: ReturnType<typeof getLocationConfig> | null;
  options: typeof LOCATION_OPTIONS;
  /** Updates the selected location in state/localStorage only — does not navigate. */
  setLocation: (locationId: LocationId) => void;
  /** Called by the location-aware layout whenever the `:locationId` URL param changes. */
  syncLocationFromUrl: (locationId: LocationId) => void;
  /** Navigates to a page segment (e.g. "/menu") under the current location. */
  navigateWithLocationGuard: (path: string) => void;
};

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [selectedLocationId, setSelectedLocationId] = useState<LocationId | null>(
    readStoredLocationId,
  );

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LOCATION_STORAGE_KEY) return;
      const next = event.newValue;
      if (next && LOCATION_OPTIONS.some((option) => option.id === next)) {
        setSelectedLocationId(next as LocationId);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((locationId: LocationId) => {
    setSelectedLocationId(locationId);
    window.localStorage.setItem(LOCATION_STORAGE_KEY, locationId);
  }, []);

  /** Called on every render of a /:locationId/* route to keep context in sync with the URL. */
  const syncLocationFromUrl = useCallback(
    (locationId: LocationId) => {
      persist(locationId);
    },
    [persist],
  );

  /** Explicit location switch (e.g. from CMS `?location=` query params) — no navigation. */
  const setLocation = useCallback(
    (locationId: LocationId) => {
      persist(locationId);
    },
    [persist],
  );

  /** Navigates to a page segment under the current (or given) location. */
  const navigateWithLocationGuard = useCallback(
    (path: string) => {
      navigate(locPath(selectedLocationId, path));
    },
    [navigate, selectedLocationId],
  );

  const value = useMemo<LocationContextValue>(
    () => ({
      selectedLocationId,
      selectedLocation: selectedLocationId ? getLocationConfig(selectedLocationId) : null,
      options: LOCATION_OPTIONS,
      setLocation,
      syncLocationFromUrl,
      navigateWithLocationGuard,
    }),
    [navigateWithLocationGuard, selectedLocationId, setLocation, syncLocationFromUrl],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationSelection() {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error("useLocationSelection must be used within LocationProvider");
  }
  return ctx;
}
