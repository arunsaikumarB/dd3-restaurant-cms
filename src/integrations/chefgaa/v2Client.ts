import { V2_API_BASE_URL, V2_PLATFORM_HEADER } from "./constants";
import type { V2MenuCategory } from "./types";
import { isTransientHttpStatus, withRetry } from "./utils";

export type V2ClientOptions = {
  tenantId: string;
  storeId: string;
  platformSlug: string;
};

function buildV2Headers(options: V2ClientOptions): Record<string, string> {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-platform": V2_PLATFORM_HEADER,
    "tenant-id": options.tenantId,
    "store-id": options.storeId,
  };
}

async function fetchV2Json<T>(url: string, headers: Record<string, string>): Promise<T> {
  const response = await fetch(url, { method: "GET", headers });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `ChefGaa V2 API ${response.status} ${response.statusText}${body ? `: ${body.slice(0, 240)}` : ""}`,
    );
  }

  return (await response.json()) as T;
}

type V2PlatformEnvelope = {
  success?: boolean;
  data?: {
    id?: string;
    data?: {
      categories?: V2MenuCategory[];
    };
    categories?: V2MenuCategory[];
  };
};

type V2MenuEnvelope = {
  success?: boolean;
  data?: {
    data?: {
      categories?: V2MenuCategory[];
    };
    categories?: V2MenuCategory[];
  };
};

type V2MenuPayloadNode = {
  data?: { categories?: V2MenuCategory[] };
  categories?: V2MenuCategory[];
};

function categoriesFromNode(node: V2MenuPayloadNode | undefined): V2MenuCategory[] {
  if (!node) return [];
  const nested = node.data ?? node;
  const categories = nested?.categories ?? node.categories;
  return Array.isArray(categories) ? categories : [];
}

function extractCategories(payload: V2MenuEnvelope | V2PlatformEnvelope): V2MenuCategory[] {
  const root = payload.data;

  // Lawrenceville V2 returns `data` as a platform array, each with nested categories.
  if (Array.isArray(root)) {
    const fromPlatforms = root.flatMap((entry) =>
      categoriesFromNode(entry as V2MenuPayloadNode),
    );
    if (fromPlatforms.length > 0) return fromPlatforms;
  }

  return categoriesFromNode(root as V2MenuPayloadNode | undefined);
}

/**
 * Resolves platform id then downloads the V2 menu catalog.
 */
export async function fetchV2MenuCatalog(options: V2ClientOptions): Promise<V2MenuCategory[]> {
  const headers = buildV2Headers(options);

  return withRetry(`v2 menu (${options.platformSlug})`, async () => {
    const platform = await fetchV2Json<V2PlatformEnvelope>(
      `${V2_API_BASE_URL}/api/v1/public/menu/platforms/slug/${encodeURIComponent(options.platformSlug)}`,
      headers,
    );

    const platformId = platform.data?.id;
    if (!platformId) {
      const inlineCategories = extractCategories(platform);
      if (inlineCategories.length > 0) {
        return inlineCategories;
      }
      throw new Error(
        `ChefGaa V2 platform "${options.platformSlug}" did not return a platform id.`,
      );
    }

    const menu = await withRetry(`v2 menu payload (${platformId})`, async () => {
      try {
        return await fetchV2Json<V2MenuEnvelope>(
          `${V2_API_BASE_URL}/api/v1/public/menu/platforms/${platformId}`,
          headers,
        );
      } catch (error) {
        if (error instanceof Error && isTransientHttpStatus(Number(error.message.match(/\d{3}/)?.[0]))) {
          throw error;
        }
        throw error;
      }
    });

    const categories = extractCategories(menu);
    if (categories.length === 0) {
      throw new Error(`ChefGaa V2 menu for platform ${platformId} returned no categories.`);
    }

    return categories;
  });
}
