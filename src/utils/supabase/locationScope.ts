import type { LocationId } from "../../config/locations";

export class LocationScopeError extends Error {
  constructor(message = "Record not found for the selected location.") {
    super(message);
    this.name = "LocationScopeError";
  }
}

export function assertLocationId(locationId: LocationId | null | undefined): asserts locationId is LocationId {
  if (!locationId) {
    throw new LocationScopeError("Select a single location in the header.");
  }
}
