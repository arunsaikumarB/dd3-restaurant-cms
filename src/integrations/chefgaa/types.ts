import type { LocationId } from "../../config/locations";

export type ChefGaaApiVersion = "legacy" | "v2";

export type ContentStatus = "active" | "inactive";

export type NormalizedCategory = {
  /** ChefGaa external category identifier (stringified). */
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  locationId: LocationId;
  status: ContentStatus;
};

export type NormalizedMenuItem = {
  /** ChefGaa outlet menu item id (stringified). */
  id: string;
  categoryId: string;
  catalogItemId: string | null;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  veg: boolean;
  popular: boolean;
  chefSpecial: boolean;
  /** When false the item is unavailable in POS for this location/order type. */
  availability: boolean;
  spiceLevel: number | null;
  displayOrder: number;
  locationId: LocationId;
};

export type ChefGaaLocationIntegrationConfig = {
  locationId: LocationId;
  apiVersion: ChefGaaApiVersion;
  legacyOutletId: number | null;
  legacyPartnerId: number;
  legacyOrderTypeId: number | null;
  v2TenantId: string | null;
  v2StoreId: string | null;
  v2PlatformSlug: string | null;
  syncEnabled: boolean;
};

export type NormalizedMenuCatalog = {
  locationId: LocationId;
  categories: NormalizedCategory[];
  items: NormalizedMenuItem[];
};

export type SyncTrigger = "manual" | "scheduled" | "retry";

export type SyncRunStatus = "running" | "success" | "partial" | "failed";

export type CategorySyncStats = {
  created: number;
  updated: number;
  deactivated: number;
  unchanged: number;
  failed: number;
};

export type MenuSyncStats = {
  created: number;
  updated: number;
  deactivated: number;
  pricesChanged: number;
  availabilityChanged: number;
  unchanged: number;
  failed: number;
};

export type SyncLocationSummary = {
  locationId: LocationId;
  success: boolean;
  status: SyncRunStatus;
  categories: CategorySyncStats;
  items: MenuSyncStats;
  errors: string[];
  durationMs: number;
  runId: string | null;
  message: string;
};

export type SyncAllSummary = {
  success: boolean;
  locations: SyncLocationSummary[];
  durationMs: number;
  message: string;
};

/** Raw legacy API shapes (partial). */
export type LegacyOrderTypeAvailability = {
  order_type: number;
  available: boolean;
};

export type LegacyMenuItem = {
  name: string;
  OutletMenuItem: number;
  selling_price?: number | null;
  cost_price?: number | null;
  sort_order?: number | null;
  mark_as_unavailable?: boolean;
  item_available_in_store?: boolean;
  image?: string | null;
  description?: string | null;
  is_customizable?: boolean;
  is_recommended?: boolean;
  availability?: {
    order_types?: LegacyOrderTypeAvailability[];
  };
};

export type LegacyMenuCategory = {
  name: string;
  OutletMenuItemCategory: number;
  sort_order?: number | null;
  menuItems?: LegacyMenuItem[];
  availability?: {
    order_types?: LegacyOrderTypeAvailability[];
  };
};

/** Raw V2 API shapes (partial, tolerant). */
export type V2MenuItem = Record<string, unknown> & {
  id?: string | number;
  name?: string;
  description?: string | null;
  selling_price?: number | null;
  sellingPrice?: number | null;
  price?: number | null;
  image?: string | null;
  imageUrl?: string | null;
  isVeg?: boolean;
  is_veg?: boolean;
  isRecommended?: boolean;
  is_recommended?: boolean;
  isUnavailable?: boolean;
  is_unavailable?: boolean;
  sortOrder?: number | null;
  sort_order?: number | null;
};

export type V2MenuCategory = Record<string, unknown> & {
  id?: string | number;
  name?: string;
  sortOrder?: number | null;
  sort_order?: number | null;
  items?: V2MenuItem[];
  menuItems?: V2MenuItem[];
};
