import { useAdminLocationContext } from "../context/AdminLocationContext";
import type { AdminLocationScope } from "../types/location";
import type { LocationId } from "../../config/locations";

/**
 * Global admin location hook — reads from AdminLocationContext.
 */
export function useLocation() {
  const {
    scope,
    locationId,
    locationSlug,
    isAllLocations,
    options,
    currentLocation,
    setLocation,
    setLocationId,
  } = useAdminLocationContext();

  return {
    scope,
    locationId,
    locationSlug,
    isAllLocations,
    options,
    currentLocation,
    setLocation,
    setLocationId,
    currentLocationId: scope === "all" ? null : scope,
  };
}

export function useAdminLocation() {
  return useLocation();
}

export type { AdminLocationScope, LocationId };
