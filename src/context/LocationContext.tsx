import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LOCATION_STORAGE_KEY,
  LOCATION_OPTIONS,
  type LocationId,
  getLocationConfig,
  isLocationRequiredPath,
} from "../config/locations";
import LocationSelectorModal from "../components/location/LocationSelectorModal";

type LocationContextValue = {
  selectedLocationId: LocationId | null;
  selectedLocation: ReturnType<typeof getLocationConfig> | null;
  options: typeof LOCATION_OPTIONS;
  setLocation: (locationId: LocationId) => void;
  requestLocationSelection: (nextPath?: string) => void;
  navigateWithLocationGuard: (nextPath: string) => void;
};

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [selectedLocationId, setSelectedLocationId] = useState<LocationId | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCATION_STORAGE_KEY) as LocationId | null;
    if (!stored) return;
    if (LOCATION_OPTIONS.some((option) => option.id === stored)) {
      setSelectedLocationId(stored);
    }
  }, []);

  const setLocation = useCallback((locationId: LocationId) => {
    setSelectedLocationId(locationId);
    window.localStorage.setItem(LOCATION_STORAGE_KEY, locationId);
  }, []);

  const requestLocationSelection = useCallback((nextPath?: string) => {
    setPendingPath(nextPath ?? null);
    setSelectorOpen(true);
  }, []);

  const navigateWithLocationGuard = useCallback(
    (nextPath: string) => {
      if (selectedLocationId) {
        navigate(nextPath);
        return;
      }
      requestLocationSelection(nextPath);
    },
    [navigate, requestLocationSelection, selectedLocationId],
  );

  useEffect(() => {
    if (selectedLocationId || !isLocationRequiredPath(pathname)) return;
    setPendingPath(pathname);
    setSelectorOpen(true);
  }, [pathname, selectedLocationId]);

  const handleSelect = useCallback(
    (locationId: LocationId) => {
      setLocation(locationId);
      setSelectorOpen(false);
      const next = pendingPath;
      setPendingPath(null);
      if (next) {
        navigate(next);
      }
    },
    [navigate, pendingPath, setLocation],
  );

  const handleClose = useCallback(() => {
    setSelectorOpen(false);
    setPendingPath(null);
    if (!selectedLocationId && isLocationRequiredPath(pathname)) {
      navigate("/");
    }
  }, [navigate, pathname, selectedLocationId]);

  const value = useMemo<LocationContextValue>(
    () => ({
      selectedLocationId,
      selectedLocation: selectedLocationId ? getLocationConfig(selectedLocationId) : null,
      options: LOCATION_OPTIONS,
      setLocation,
      requestLocationSelection,
      navigateWithLocationGuard,
    }),
    [
      navigateWithLocationGuard,
      requestLocationSelection,
      selectedLocationId,
      setLocation,
    ],
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
      <LocationSelectorModal
        open={selectorOpen}
        selectedLocationId={selectedLocationId}
        options={LOCATION_OPTIONS}
        onSelect={handleSelect}
        onClose={handleClose}
      />
    </LocationContext.Provider>
  );
}

export function useLocationSelection() {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error("useLocationSelection must be used within LocationProvider");
  }
  return ctx;
}
