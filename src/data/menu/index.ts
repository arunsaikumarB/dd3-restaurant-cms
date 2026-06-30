import type { LocationId } from "../../config/locations";
import type { MenuData } from "../../types/menu";
import lawrencevilleMenu from "./lawrenceville";
import oakTreeMenu from "./oakTree";
import southPlainfieldMenu from "./southPlainfield";

/** Location-specific static menus keyed by location id. */
const STATIC_MENUS: Partial<Record<LocationId, MenuData>> = {
  "south-plainfield": southPlainfieldMenu,
  "oak-tree": oakTreeMenu,
  lawrenceville: lawrencevilleMenu,
};

export function getStaticMenuForLocation(locationId: LocationId): MenuData | null {
  return STATIC_MENUS[locationId] ?? null;
}

export { lawrencevilleMenu, oakTreeMenu, southPlainfieldMenu };
