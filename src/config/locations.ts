import type { MenuData } from "../types/menu";
import type { PublicOffer } from "../services/offersPublic";

export type LocationId = "south-plainfield" | "oak-tree" | "lawrenceville";

export type LocationHours = {
  weekday: string;
  weekend: string;
  sunday: string;
};

export type LocationConfig = {
  id: LocationId;
  name: string;
  shortName: string;
  address: string;
  phone: string;
  email: string;
  googleMapsEmbed: string;
  reservationLink: string;
  orderDirectLink: string;
  uberEatsLink: string;
  openingHours: LocationHours;
  menuPriceMultiplier: number;
  hiddenCategorySlugs: string[];
  hiddenItemKeywords: string[];
  offers: PublicOffer[];
};

export const LOCATION_STORAGE_KEY = "dd3.selectedLocation";
/** Default public-site location when none is selected yet (homepage, etc.). */
export const DEFAULT_PUBLIC_LOCATION_ID: LocationId = "south-plainfield";
/** Shared admin CMS location preference (menu, categories, offers). */
export const ADMIN_LOCATION_STORAGE_KEY = "dd3.admin.selectedLocation";
/** @deprecated Use ADMIN_LOCATION_STORAGE_KEY */
export const ADMIN_MENU_LOCATION_STORAGE_KEY = ADMIN_LOCATION_STORAGE_KEY;

export const LOCATIONS: Record<LocationId, LocationConfig> = {
  "south-plainfield": {
    id: "south-plainfield",
    name: "South Plainfield",
    shortName: "South Plainfield",
    address: "4941 Stelton Rd, South Plainfield, NJ 07080",
    phone: "(908) 555-2101",
    email: "southplainfield@desidhamaka.com",
    googleMapsEmbed:
      "https://www.google.com/maps?q=4941+Stelton+Rd+South+Plainfield+NJ+07080&output=embed",
    reservationLink: "https://www.opentable.com/r/desi-dhamaka-south-plainfield",
    orderDirectLink: "https://order.chefgaa.com/store/desi-dhamaka?order_type=106",
    uberEatsLink: "https://www.ubereats.com/store/desi-dhamaka-south-plainfield/placeholder",
    openingHours: {
      weekday: "11:00 AM - 10:00 PM",
      weekend: "11:00 AM - 11:00 PM",
      sunday: "11:00 AM - 9:30 PM",
    },
    menuPriceMultiplier: 1.02,
    hiddenCategorySlugs: ["desserts"],
    hiddenItemKeywords: ["family feast"],
    offers: [],
  },
  "oak-tree": {
    id: "oak-tree",
    name: "Oak Tree",
    shortName: "Oak Tree",
    address: "1676 Oak Tree Rd, Edison, NJ 08820",
    phone: "(732) 555-3044",
    email: "oaktree@desidhamaka.com",
    googleMapsEmbed:
      "https://www.google.com/maps?q=1676+Oak+Tree+Rd+Edison+NJ+08820&output=embed",
    reservationLink: "https://www.opentable.com/r/desi-dhamaka-oak-tree",
    orderDirectLink: "https://order.chefgaa.com/store/desi-dhamaka?order_type=108",
    uberEatsLink: "https://www.ubereats.com/store/desi-dhamaka-oak-tree/placeholder",
    openingHours: {
      weekday: "11:30 AM - 10:00 PM",
      weekend: "11:30 AM - 11:30 PM",
      sunday: "11:30 AM - 10:00 PM",
    },
    menuPriceMultiplier: 1.05,
    hiddenCategorySlugs: ["beverages"],
    hiddenItemKeywords: ["kids"],
    offers: [],
  },
  lawrenceville: {
    id: "lawrenceville",
    name: "Lawrenceville",
    shortName: "Lawrenceville",
    address: "Lawrence Township, NJ",
    phone: "(609) 555-8801",
    email: "lawrenceville@desidhamaka.com",
    googleMapsEmbed:
      "https://www.google.com/maps?q=Lawrence+Township+NJ&output=embed",
    reservationLink: "/reservation",
    orderDirectLink: "https://orders.chefgaa.com/store/desi-dhamaka/menu",
    uberEatsLink:
      "https://www.ubereats.com/store/desi-dhamaka-lawrence-township/kiykavZIUSO5gjxyTB_BOA",
    openingHours: {
      weekday: "11:00 AM - 10:00 PM",
      weekend: "11:00 AM - 11:00 PM",
      sunday: "11:00 AM - 9:30 PM",
    },
    menuPriceMultiplier: 1,
    hiddenCategorySlugs: [],
    hiddenItemKeywords: [],
    offers: [],
  },
};

export const LOCATION_IDS = Object.keys(LOCATIONS) as LocationId[];

export function isLocationId(value: string): value is LocationId {
  return value in LOCATIONS;
}

export const LOCATION_OPTIONS = (Object.keys(LOCATIONS) as LocationId[]).map((id) => ({
  id,
  name: LOCATIONS[id].name,
  address: LOCATIONS[id].address,
}));

export const LOCATION_REQUIRED_PATHS = ["/menu", "/order", "/reservation"];

export function isLocationRequiredPath(pathname: string): boolean {
  return LOCATION_REQUIRED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function getLocationConfig(locationId: LocationId): LocationConfig {
  return LOCATIONS[locationId];
}

export function getLocationSlug(locationId: LocationId): string {
  return locationId;
}

/** Resolve the active public location from context, localStorage, or default. */
export function resolvePublicLocationId(
  locationId: LocationId | null | undefined,
): LocationId {
  if (locationId) return locationId;
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(LOCATION_STORAGE_KEY);
    if (stored && isLocationId(stored)) return stored;
  }
  return DEFAULT_PUBLIC_LOCATION_ID;
}

/** Read persisted location from localStorage (browser only). */
export function readStoredLocationId(): LocationId | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(LOCATION_STORAGE_KEY);
  if (stored && isLocationId(stored)) return stored;
  return null;
}

export function applyLocationToMenu(menu: MenuData, locationId: LocationId): MenuData {
  const config = getLocationConfig(locationId);
  const hiddenKeywordSet = new Set(config.hiddenItemKeywords.map((x) => x.toLowerCase()));
  const hiddenCategorySet = new Set(config.hiddenCategorySlugs.map((x) => x.toLowerCase()));
  const normalize = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const categories = menu.categories
    .filter((category) => {
      const candidates = [
        category.rawName,
        category.name,
        category.items[0]?.categorySlug ?? "",
      ].map((value) => normalize(value));
      return !candidates.some((candidate) => hiddenCategorySet.has(candidate));
    })
    .map((category) => {
      const items = category.items
        .filter((item) => {
          const itemName = item.name.toLowerCase();
          for (const keyword of hiddenKeywordSet) {
            if (itemName.includes(keyword)) return false;
          }
          return true;
        })
        .map((item) => ({
          ...item,
          price: Number((item.price * config.menuPriceMultiplier).toFixed(2)),
        }));

      return {
        ...category,
        itemCount: items.length,
        items,
      };
    })
    .filter((category) => category.items.length > 0);

  const totalItems = categories.reduce((sum, category) => sum + category.items.length, 0);
  return {
    ...menu,
    categories,
    totalItems,
    source: `${menu.source}:${locationId}`,
  };
}
