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
  doorDashLink: string;
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
    address: `6001 Hadley Road,
South Plainfield, NJ 07080`,
    phone: "+1 (732) 444-2425",
    email: "southplainfield@desidhamaka.com",
    googleMapsEmbed:
      "https://www.google.com/maps?q=4941+Stelton+Rd+South+Plainfield+NJ+07080&output=embed",
    reservationLink: "https://www.opentable.com/r/desi-dhamaka-south-plainfield",
    orderDirectLink: "https://order.chefgaa.com/store/desi-dhamaka/outlet/70",
    uberEatsLink: "https://www.ubereats.com/store/desi-dhamaka-indian-restaurant/Flzpa94fTZWgImQYROzohQ?srsltid=AfmBOopzRGdQiLLrkwb-Na0COGReThF3Clv1tEtF7tnp5w4Qc3IdWt3d",
    doorDashLink: "https://www.doordash.com/en/store/desi-dhamaka-indian-restaurant-south-plainfield-29592911/?srsltid=AfmBOoqoRUfHZsJzA3wsz-s29_cHH-BbXt4hdCOPTvr9g0Odhg8nNwRP",
    openingHours: {
      weekday: "11:30 AM - 10:30 PM",
      weekend: "11:00 AM - 11:00 PM",
      sunday: "11:30 AM - 10:00 PM",
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
    address: "1734 Oaktree Rd, Edison, NJ 08820",
    phone: "+1 (848) 219‑5184",
    email: "oaktree@desidhamaka.com",
    googleMapsEmbed:
      "https://www.google.com/maps?q=1676+Oak+Tree+Rd+Edison+NJ+08820&output=embed",
    reservationLink: "https://www.opentable.com/r/desi-dhamaka-oak-tree",
    orderDirectLink: "https://order.chefgaa.com/store/desi-dhamaka/outlet/71",
    uberEatsLink: "https://www.ubereats.com/store/desi-dhamaka/fJIwsyPVW965vXfss6xr6A?srsltid=AfmBOopIffZpYDcA32x2G2ZAJxcH1SFKWbDDJH_qvmiE7-qEOXbyl8M2",
    doorDashLink: "https://www.doordash.com/store/desi-dhamaka-edison-34765901/72377746/",
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
    address: " 540 Lawrence Square Blvd S, Lawrence Township, NJ 08648",
    phone: "+1 (732) 979-8889",
    email: "lawrenceville@desidhamaka.com",
    googleMapsEmbed:
      "https://www.google.com/maps?q=Lawrence+Township+NJ&output=embed",
    reservationLink: "/reservation",
    orderDirectLink: "https://orders.chefgaa.com/store/desi-dhamaka/menu",
    uberEatsLink:
      "https://www.ubereats.com/store/desi-dhamaka-lawrence-township/kiykavZIUSO5gjxyTB_BOA?srsltid",
    doorDashLink: "",
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
