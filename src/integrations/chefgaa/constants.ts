import type { LocationId } from "../../config/locations";
import type { ChefGaaApiVersion } from "./types";

export const LEGACY_API_BASE_URL = "https://api.chefgaa.com";
export const V2_API_BASE_URL = "https://chf2-customer-api.chefgaa.com";

export const DEFAULT_LEGACY_PARTNER_ID = 1;
export const V2_PLATFORM_HEADER = "web";

/** Fallback when DB config row is unavailable (matches migration seed). */
export const CHEFGAA_LOCATION_DEFAULTS: Record<
  LocationId,
  {
    apiVersion: ChefGaaApiVersion;
    legacyOutletId?: number;
    legacyOrderTypeId?: number;
    v2TenantId?: string;
    v2StoreId?: string;
    v2PlatformSlug?: string;
  }
> = {
  "south-plainfield": {
    apiVersion: "legacy",
    legacyOutletId: 70,
    legacyOrderTypeId: 106,
  },
  "oak-tree": {
    apiVersion: "legacy",
    legacyOutletId: 71,
    legacyOrderTypeId: 108,
  },
  lawrenceville: {
    apiVersion: "v2",
    v2TenantId: "bc3e7543-c8d6-4d77-bd87-d30cda29ca51",
    v2StoreId: "b8e4c76f-0534-47e8-952f-495e60959158",
    v2PlatformSlug: "online-ordering",
  },
};

export const SYNC_RETRY_ATTEMPTS = 3;
/** Backoff between retries: 5s, 15s, 30s (enterprise Phase D). */
export const SYNC_RETRY_DELAYS_MS = [5_000, 15_000, 30_000] as const;

/** Orchestration lock TTL — stale locks auto-expire. */
export const SYNC_LOCK_TTL_MS = 45 * 60 * 1000;

/** Scheduled sync interval (15 minutes). */
export const SCHEDULED_SYNC_INTERVAL_MS = 15 * 60 * 1000;

export const CHEFGAA_IMAGE_CDN_PREFIX =
  "https://chefgaadevstor.blob.core.windows.net/online-ordering-item-images-prod/";
