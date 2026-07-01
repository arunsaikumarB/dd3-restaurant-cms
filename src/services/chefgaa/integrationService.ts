import { LOCATION_IDS, type LocationId } from "../../config/locations";
import { createClientIfConfigured } from "../../lib/supabase/client";
import {
  fetchChefGaaHistoryData,
  fetchChefGaaOverviewData,
  invalidateChefGaaLiveCache,
} from "./supabaseQueries";
import type {
  ChefGaaIntegrationOverview,
  ChefGaaLocationSyncSnapshot,
  ChefGaaSyncHistoryEntry,
  ChefGaaSyncRequest,
  ChefGaaSyncResponse,
} from "./types";

const SYNC_FUNCTION_PATH = "/.netlify/functions/chefgaa-sync";

async function invokeChefGaaSyncApi(
  locationId?: LocationId | null,
): Promise<ChefGaaSyncResponse> {
  const supabase = createClientIfConfigured();
  if (!supabase) {
    return {
      accepted: false,
      message:
        "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return {
      accepted: false,
      message: "Sign in to the admin dashboard to run ChefGaa sync.",
    };
  }

  try {
    const response = await fetch(SYNC_FUNCTION_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ locationId: locationId ?? null }),
    });

    const payload = (await response.json()) as {
      accepted?: boolean;
      message?: string;
      status?: string;
    };

    invalidateChefGaaLiveCache();

    return {
      accepted: Boolean(payload.accepted),
      message:
        payload.message ??
        (payload.status === "queued"
          ? "Sync queued — will run after the current sync finishes."
          : payload.status === "already_running"
            ? "Already Running"
            : "Sync request processed."),
    };
  } catch (error) {
    return {
      accepted: false,
      message:
        error instanceof Error
          ? `Sync API unavailable: ${error.message}. Use npm run sync:chefgaa locally or deploy Netlify functions.`
          : "Sync API unavailable.",
    };
  }
}

/**
 * Returns integration overview for the admin dashboard.
 */
export async function fetchChefGaaIntegrationOverview(): Promise<ChefGaaIntegrationOverview> {
  return fetchChefGaaOverviewData();
}

/**
 * Returns sync audit history (newest first) from Supabase.
 */
export async function fetchChefGaaSyncHistory(): Promise<ChefGaaSyncHistoryEntry[]> {
  return fetchChefGaaHistoryData("all");
}

/**
 * Queue a full-menu sync for all locations via the server-side orchestrator.
 */
export async function syncAllChefGaaLocations(
  _request: ChefGaaSyncRequest = {},
): Promise<ChefGaaSyncResponse> {
  return invokeChefGaaSyncApi(null);
}

/**
 * Queue a full-menu sync for one location via the server-side orchestrator.
 */
export async function syncChefGaaLocation(
  locationId: LocationId,
  _request: ChefGaaSyncRequest = {},
): Promise<ChefGaaSyncResponse> {
  if (!LOCATION_IDS.includes(locationId)) {
    return {
      accepted: false,
      message: `Unknown location: ${locationId}`,
    };
  }

  return invokeChefGaaSyncApi(locationId);
}

/** Test hook for future unit tests — not used in production UI. */
export function __resetChefGaaIntegrationStateForTests(): void {
  invalidateChefGaaLiveCache();
}

export type { ChefGaaLocationSyncSnapshot };
