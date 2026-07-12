/**
 * Menu Planner — custom menus + AI-style recommendations from requirements.
 */

import { insertMenu, listMenusForEvent } from "./repository";
import type { EventMenu, EventPackage, EventRequirements } from "./types";

const SEASONAL_HINTS: Record<number, string[]> = {
  0: ["Warm soups", "Comfort curries"],
  1: ["Warm soups", "Comfort curries"],
  2: ["Spring chaat", "Light starters"],
  3: ["Spring chaat", "Light starters"],
  4: ["Grilled items", "Fresh salads"],
  5: ["Grilled items", "Cool drinks"],
  6: ["Cool drinks", "Light biryani"],
  7: ["Cool drinks", "Light biryani"],
  8: ["Festival sweets", "Festive thali"],
  9: ["Festival sweets", "Festive thali"],
  10: ["Warm desserts", "Rich curries"],
  11: ["Warm desserts", "Rich curries"],
};

export function recommendMenu(req: EventRequirements, pkg?: EventPackage | null): {
  menu: Omit<EventMenu, "id" | "eventId">;
  hints: string[];
} {
  const month = new Date().getMonth();
  const seasonal = SEASONAL_HINTS[month] ?? [];
  const dietary = (req.dietary ?? []).map((d) => d.toLowerCase());
  const vegOnly = dietary.some((d) => d.includes("veg") && !d.includes("non"));
  const jain = dietary.some((d) => d.includes("jain"));
  const kids = Boolean(req.needs?.kids) || dietary.some((d) => d.includes("kids"));

  const fromPkg = pkg?.menuJson ?? {};
  const asList = (key: string, fallback: string[]): string[] => {
    const v = fromPkg[key];
    return Array.isArray(v) && v.length ? (v as string[]) : fallback;
  };

  let starters = asList("starters", vegOnly ? ["Paneer Tikka", "Veg Samosa"] : ["Chicken 65", "Samosa"]);
  let mains = asList(
    "mains",
    vegOnly
      ? ["Paneer Butter Masala", "Dal Makhani", "Veg Korma"]
      : ["Butter Chicken", "Lamb Rogan Josh", "Dal Makhani"],
  );
  if (jain) {
    starters = starters.filter((x) => !/onion|garlic|egg/i.test(x)).concat(["Jain Starter Platter"]);
    mains = mains.filter((x) => !/onion|garlic|egg/i.test(x)).concat(["Jain Special Thali"]);
  }

  const menu: Omit<EventMenu, "id" | "eventId"> = {
    locationId: req.locationId,
    name: pkg ? `${pkg.name} Menu` : "Custom Event Menu",
    starters,
    mains,
    rice: asList("rice", ["Jeera Rice", "Vegetable Biryani"]),
    breads: asList("breads", ["Butter Naan", "Roti"]),
    desserts: asList("desserts", req.needs?.cake ? ["Celebration Cake", "Gulab Jamun"] : ["Gulab Jamun", "Kulfi"]),
    drinks: asList("drinks", ["Mango Lassi", "Soft Drinks"]),
    liveCounters: req.needs?.liveCounter
      ? asList("live_counters", ["Live Dosa", "Chaat Counter"])
      : asList("live_counters", []),
    kidsMenu: kids ? ["Kids Pasta", "Mild Paneer", "Fries"] : [],
    notes: req.specialRequests ?? null,
  };

  const hints = [
    ...seasonal.map((s) => `Seasonal: ${s}`),
    ...(req.budget != null && req.budget < 500
      ? ["Budget-conscious: prefer Silver / Corporate Lunch packages"]
      : []),
    ...(req.guestCount && req.guestCount >= 60 ? ["Large guest count: consider live counters + plated VIP table"] : []),
    ...(req.cuisine ? [`Cuisine preference: ${req.cuisine}`] : []),
  ];

  return { menu, hints };
}

export async function saveMenuForEvent(
  eventId: string,
  locationId: string,
  draft: Omit<EventMenu, "id" | "eventId">,
): Promise<EventMenu | null> {
  return insertMenu({
    eventId,
    locationId,
    name: draft.name,
    starters: draft.starters,
    mains: draft.mains,
    rice: draft.rice,
    breads: draft.breads,
    desserts: draft.desserts,
    drinks: draft.drinks,
    liveCounters: draft.liveCounters,
    kidsMenu: draft.kidsMenu,
    notes: draft.notes,
  });
}

export async function getEventMenus(eventId: string): Promise<EventMenu[]> {
  return listMenusForEvent(eventId);
}
