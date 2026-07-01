import { createClientIfConfigured } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/env";
import { getLocationConfig, LOCATION_IDS, type LocationId } from "../../config/locations";
import { fetchChefGaaLiveBundle } from "../../services/chefgaa/supabaseQueries";
import type { ChefGaaDashboardSummary } from "../../services/chefgaa/types";
import type { AdminLocationScope } from "../types/location";
import type { ActivityItem, AdminStat } from "../types";

export type DashboardStats = {
  stats: AdminStat[];
  locationLabel: string;
  chefGaa: ChefGaaDashboardSummary | null;
  recentActivity: ActivityItem[];
};

async function countRows(
  table: "offers" | "gallery" | "reviews" | "menu_categories" | "menu_items",
  filters: { column: string; value: string | boolean }[],
): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = createClientIfConfigured();
  if (!supabase) return 0;

  let query = supabase.from(table).select("*", { count: "exact", head: true });
  for (const filter of filters) {
    query = query.eq(filter.column, filter.value);
  }

  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

async function sumAcrossLocations(
  table: "offers",
  locationIds: LocationId[],
  extraFilters: { column: string; value: string | boolean }[] = [],
): Promise<number> {
  const counts = await Promise.all(
    locationIds.map((locationId) =>
      countRows(table, [{ column: "location_id", value: locationId }, ...extraFilters]),
    ),
  );
  return counts.reduce((sum, value) => sum + value, 0);
}

function formatLastSync(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function fetchScopeStats(scope: AdminLocationScope): Promise<DashboardStats> {
  const locationIds = scope === "all" ? LOCATION_IDS : [scope];
  const locationLabel =
    scope === "all" ? "All Locations" : getLocationConfig(scope).name;

  const [activeOffers, galleryImages, approvedReviews, chefGaaBundle] = await Promise.all([
    sumAcrossLocations("offers", locationIds, [{ column: "active", value: true }]),
    countRows("gallery", []),
    countRows("reviews", [{ column: "approved", value: true }]),
    fetchChefGaaLiveBundle(scope, { force: true }),
  ]);

  const chefGaa = chefGaaBundle.dashboard;

  const stats: AdminStat[] = [
    {
      id: "locations",
      label: "Total Locations",
      value: chefGaa.totalLocations,
      change: scope === "all" ? "All branches" : "Selected branch",
      trend: "neutral",
      icon: "map",
    },
    {
      id: "connected",
      label: "Connected Locations",
      value: chefGaa.connectedLocations,
      change: "ChefGaa healthy",
      trend: chefGaa.connectedLocations > 0 ? "up" : "neutral",
      icon: "plug",
    },
    {
      id: "failed",
      label: "Failed Locations",
      value: chefGaa.failedLocations,
      change: chefGaa.failedLocations > 0 ? "Needs attention" : "All clear",
      trend: chefGaa.failedLocations > 0 ? "down" : "up",
      icon: "users",
    },
    {
      id: "last-sync",
      label: "Last Global Sync",
      value: formatLastSync(chefGaa.lastGlobalSync),
      change: chefGaa.lastSyncDurationMs
        ? `${(chefGaa.lastSyncDurationMs / 1000).toFixed(1)}s duration`
        : "Awaiting sync",
      trend: "neutral",
      icon: "clock",
    },
    {
      id: "categories",
      label: "Total Categories",
      value: chefGaa.totalCategories,
      change: scope === "all" ? "ChefGaa catalog (all locations)" : "ChefGaa catalog",
      trend: "neutral",
      icon: "layers",
    },
    {
      id: "menu-items",
      label: "Total Menu Items",
      value: chefGaa.totalMenuItems,
      change: "ChefGaa catalog",
      trend: "neutral",
      icon: "utensils",
    },
    {
      id: "offers",
      label: "Active Offers",
      value: activeOffers,
      change: scope === "all" ? "Across all branches" : "For selected location",
      trend: "neutral",
      icon: "tag",
    },
    {
      id: "gallery",
      label: "Gallery Images",
      value: galleryImages,
      change: "Global gallery",
      trend: "neutral",
      icon: "image",
    },
    {
      id: "reviews",
      label: "Approved Reviews",
      value: approvedReviews,
      change: "Published on site",
      trend: "neutral",
      icon: "star",
    },
  ];

  return {
    stats,
    locationLabel,
    chefGaa,
    recentActivity: chefGaaBundle.activity,
  };
}

export async function fetchDashboardStats(scope: AdminLocationScope): Promise<DashboardStats> {
  try {
    return await fetchScopeStats(scope);
  } catch {
    return {
      locationLabel: scope === "all" ? "All Locations" : getLocationConfig(scope as LocationId).name,
      stats: [],
      chefGaa: null,
      recentActivity: [],
    };
  }
}
