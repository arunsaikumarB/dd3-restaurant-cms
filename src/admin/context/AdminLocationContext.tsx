import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ADMIN_LOCATION_STORAGE_KEY,
  getLocationConfig,
  getLocationSlug,
  isLocationId,
  LOCATION_OPTIONS,
  LOCATIONS,
  type LocationId,
} from "../../config/locations";
import type { AdminLocationScope } from "../types/location";

const DEFAULT_LOCATION: LocationId = "south-plainfield";

type AdminLocationContextValue = {
  scope: AdminLocationScope;
  locationId: LocationId;
  locationSlug: string;
  isAllLocations: boolean;
  options: typeof LOCATION_OPTIONS;
  currentLocation: ReturnType<typeof getLocationConfig> | null;
  setLocation: (scope: AdminLocationScope) => void;
  setLocationId: (id: LocationId) => void;
};

const AdminLocationContext = createContext<AdminLocationContextValue | null>(null);

function readStoredScope(): AdminLocationScope {
  try {
    const stored = localStorage.getItem(ADMIN_LOCATION_STORAGE_KEY);
    if (stored === "all") return "all";
    if (stored && isLocationId(stored)) return stored;
  } catch {
    /* ignore storage errors */
  }
  return DEFAULT_LOCATION;
}

function resolveLocationId(scope: AdminLocationScope): LocationId {
  return scope === "all" ? DEFAULT_LOCATION : scope;
}

export function AdminLocationProvider({ children }: { children: ReactNode }) {
  const [scope, setScopeState] = useState<AdminLocationScope>(readStoredScope);

  const persistScope = useCallback((next: AdminLocationScope) => {
    setScopeState(next);
    try {
      localStorage.setItem(ADMIN_LOCATION_STORAGE_KEY, next);
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const setLocation = useCallback(
    (next: AdminLocationScope) => {
      persistScope(next);
    },
    [persistScope],
  );

  const setLocationId = useCallback(
    (id: LocationId) => {
      persistScope(id);
    },
    [persistScope],
  );

  const value = useMemo<AdminLocationContextValue>(() => {
    const isAllLocations = scope === "all";
    const locationId = resolveLocationId(scope);

    return {
      scope,
      locationId,
      locationSlug: getLocationSlug(locationId),
      isAllLocations,
      options: LOCATION_OPTIONS,
      currentLocation: isAllLocations ? null : getLocationConfig(scope),
      setLocation,
      setLocationId,
    };
  }, [scope, setLocation, setLocationId]);

  return (
    <AdminLocationContext.Provider value={value}>{children}</AdminLocationContext.Provider>
  );
}

export function useAdminLocationContext(): AdminLocationContextValue {
  const context = useContext(AdminLocationContext);
  if (!context) {
    throw new Error("useAdminLocationContext must be used within AdminLocationProvider");
  }
  return context;
}

/** All configured restaurant location IDs (configuration-driven). */
export const ADMIN_LOCATION_IDS = Object.keys(LOCATIONS) as LocationId[];
