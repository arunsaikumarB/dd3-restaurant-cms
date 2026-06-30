import { createClientIfConfigured } from "../../lib/supabase/client";
import { isSupabaseConfigured } from "../../lib/supabase/env";
import { getLocationConfig, LOCATION_IDS, type LocationId } from "../../config/locations";
import type { AdminLocationScope } from "../types/location";
import type { AdminStat } from "../types";

export type DashboardStats = {
  stats: AdminStat[];
  locationLabel: string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function countRows(
  table: "menu_items" | "offers" | "reservations" | "gallery" | "reviews",
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
  table: "menu_items" | "offers" | "reservations",
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

async function fetchScopeStats(scope: AdminLocationScope): Promise<DashboardStats> {
  const today = todayIso();
  const locationIds = scope === "all" ? LOCATION_IDS : [scope];
  const locationLabel =
    scope === "all" ? "All Locations" : getLocationConfig(scope).name;

  const [menuItems, activeOffers, reservationsToday, galleryImages, reviews] = await Promise.all([
    sumAcrossLocations("menu_items", locationIds),
    sumAcrossLocations("offers", locationIds, [{ column: "active", value: true }]),
    sumAcrossLocations("reservations", locationIds, [{ column: "date", value: today }]),
    countRows("gallery", []),
    countRows("reviews", []),
  ]);

  const stats: AdminStat[] = [
    {
      id: "menu",
      label: "Total Menu Items",
      value: menuItems,
      change: scope === "all" ? "Across all branches" : "For selected location",
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
      id: "reservations",
      label: "Reservations Today",
      value: reservationsToday,
      change: scope === "all" ? "All branches combined" : "For selected location",
      trend: reservationsToday > 0 ? "up" : "neutral",
      icon: "calendar",
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
      label: "Reviews",
      value: reviews,
      change: "Global reviews",
      trend: "neutral",
      icon: "star",
    },
    {
      id: "visitors",
      label: "Website Visitors",
      value: "—",
      change: "Analytics coming soon",
      trend: "neutral",
      icon: "users",
    },
  ];

  return { stats, locationLabel };
}

export async function fetchDashboardStats(scope: AdminLocationScope): Promise<DashboardStats> {
  try {
    return await fetchScopeStats(scope);
  } catch {
    return {
      locationLabel: scope === "all" ? "All Locations" : getLocationConfig(scope as LocationId).name,
      stats: [],
    };
  }
}
