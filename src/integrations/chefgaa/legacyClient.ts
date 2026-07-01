import {
  DEFAULT_LEGACY_PARTNER_ID,
  LEGACY_API_BASE_URL,
} from "./constants";
import type { LegacyMenuCategory } from "./types";
import { isTransientHttpStatus, withRetry } from "./utils";

export type LegacyClientOptions = {
  outletId: number;
  partnerId?: number;
};

async function fetchLegacyJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...headers,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const error = new Error(
      `ChefGaa legacy API ${response.status} ${response.statusText}${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
    if (isTransientHttpStatus(response.status)) {
      throw error;
    }
    throw Object.assign(error, { fatal: true });
  }

  return (await response.json()) as T;
}

/**
 * Downloads the full legacy menu catalog for an outlet.
 * GET https://api.chefgaa.com/menu-item
 */
export async function fetchLegacyMenuCatalog(
  options: LegacyClientOptions,
): Promise<LegacyMenuCategory[]> {
  const partnerId = options.partnerId ?? DEFAULT_LEGACY_PARTNER_ID;

  return withRetry(`legacy menu (outlet ${options.outletId})`, async () => {
    const data = await fetchLegacyJson<LegacyMenuCategory[]>(
      `${LEGACY_API_BASE_URL}/menu-item`,
      {
        outlet: String(options.outletId),
        partner: String(partnerId),
      },
    );

    if (!Array.isArray(data)) {
      throw new Error("ChefGaa legacy menu response is not an array.");
    }

    return data;
  });
}
