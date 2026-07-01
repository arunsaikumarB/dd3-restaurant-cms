import type { LocationId } from "../../config/locations";
import type { ChefGaaLocationConfig } from "./types";

/**
 * Static integration metadata for the admin dashboard.
 * Runtime sync credentials should move to Supabase/env when sync is implemented.
 */
export const CHEFGAA_LOCATION_CONFIG: Record<LocationId, ChefGaaLocationConfig> = {
  "south-plainfield": {
    locationId: "south-plainfield",
    name: "South Plainfield",
    apiVersion: "legacy",
    outletId: 70,
    orderTypeId: 106,
  },
  "oak-tree": {
    locationId: "oak-tree",
    name: "Oak Tree",
    apiVersion: "legacy",
    outletId: 71,
    orderTypeId: 108,
  },
  lawrenceville: {
    locationId: "lawrenceville",
    name: "Lawrenceville",
    apiVersion: "v2",
    tenantId: "bc3e7543-c8d6-4d77-bd87-d30cda29ca51",
    storeId: "b8e4c76f-0534-47e8-952f-495e60959158",
  },
};

export function getChefGaaLocationConfig(locationId: LocationId): ChefGaaLocationConfig {
  return CHEFGAA_LOCATION_CONFIG[locationId];
}

export function listChefGaaLocationConfigs(): ChefGaaLocationConfig[] {
  return Object.values(CHEFGAA_LOCATION_CONFIG);
}
