import type { LocationConfig, LocationId } from "../../config/locations";

export type AdminLocationScope = LocationId | "all";

export type AdminLocationOption = {
  id: AdminLocationScope;
  name: string;
  address?: string;
};

export type AdminCurrentLocation = LocationConfig | null;
