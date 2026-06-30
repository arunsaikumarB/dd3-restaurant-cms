import type { LocationId } from "../../config/locations";
import type { AdminLocationScope } from "../../admin/types/location";

/**
 * Resolves the location id for a mutation.
 * In single-location mode, uses the header selection.
 * In all-locations mode, uses the row's location_id (required).
 */
export function resolveMutationLocationId(
  scope: AdminLocationScope,
  headerLocationId: LocationId,
  rowLocationId?: LocationId,
): LocationId | null {
  if (scope === "all") {
    return rowLocationId ?? null;
  }
  return headerLocationId;
}
