import { createClientIfConfigured } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/env";
import { getLocationConfig, LOCATION_IDS, type LocationId } from "../../config/locations";
import { fetchChefGaaLiveBundle } from "../../services/chefgaa/supabaseQueries";
import {
  fetchAnalyticsOfferPerformance,
  fetchAnalyticsSummary,
  pickTopOffer,
} from "../../services/analyticsAdmin";
import type { ChefGaaDashboardSummary } from "../../services/chefgaa/types";
import type { AdminLocationScope } from "../types/location";
import type { ActivityItem, AdminStat } from "../types";

export type DashboardStats = {
  stats: AdminStat[];
  insightStats: AdminStat[];
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

async function countGalleryImages(scope: AdminLocationScope): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = createClientIfConfigured();
  if (!supabase) return 0;

  if (scope === "all") {
    const { count, error } = await supabase
      .from("gallery")
      .select("*", { count: "exact", head: true });
    if (error) return 0;
    return count ?? 0;
  }

  const { count, error } = await supabase
    .from("gallery")
    .select("*", { count: "exact", head: true })
    .or(`location_id.eq.${scope},location_id.eq.all`);

  if (error) return 0;
  return count ?? 0;
}

function resolveInsightsLocationId(scope: AdminLocationScope): LocationId {
  return scope === "all" ? LOCATION_IDS[0] : scope;
}

async function fetchInsightStats(scope: AdminLocationScope): Promise<AdminStat[]> {
  const locationId = resolveInsightsLocationId(scope);
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setDate(from.getDate() - 6);
  from.setHours(0, 0, 0, 0);

  const [summary, offers] = await Promise.all([
    fetchAnalyticsSummary(locationId, from, to),
    fetchAnalyticsOfferPerformance(locationId, from, to),
  ]);

  const topOffer = pickTopOffer(offers);

  return [
    {
      id: "insight-page-views",
      label: "Page Views (7d)",
      value: summary.total_page_views,
      change: "Last 7 days",
      trend: "neutral",
      icon: "eye",
      to: "/admin/insights",
    },
    {
      id: "insight-visitors",
      label: "Unique Visitors (7d)",
      value: summary.unique_sessions,
      change: "Last 7 days",
      trend: "neutral",
      icon: "users",
      to: "/admin/insights",
    },
    {
      id: "insight-offers-page",
      label: "Offers Page Views (7d)",
      value: summary.offers_page_views,
      change: "Last 7 days",
      trend: "neutral",
      icon: "chart",
      to: "/admin/insights",
    },
    {
      id: "insight-top-offer",
      label: "Top Offer (7d)",
      value: topOffer ? `${topOffer.offer_title} (${topOffer.clicks})` : "—",
      change: "Last 7 days",
      trend: "neutral",
      icon: "click",
      to: "/admin/insights",
    },
    {
      id: "insight-order-clicks",
      label: "Order Now Clicks (7d)",
      value: summary.order_clicks,
      change: "Last 7 days",
      trend: "neutral",
      icon: "chart",
      to: "/admin/insights",
    },
  ];
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

  const [activeOffers, galleryImages, chefGaaBundle, insightStats] = await Promise.all([
    sumAcrossLocations("offers", locationIds, [{ column: "active", value: true }]),
    countGalleryImages(scope),
    fetchChefGaaLiveBundle(scope, { force: true }),
    fetchInsightStats(scope),
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
      change: scope === "all" ? "Across all branches" : "For selected location",
      trend: "neutral",
      icon: "image",
    },
  ];

  return {
    stats,
    insightStats,
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
      insightStats: [],
      chefGaa: null,
      recentActivity: [],
    };
  }
}
