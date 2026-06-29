import type { MenuCategory, MenuData, MenuItem } from "../types/menu";

/** Format price as USD, e.g. $14.99 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(price);
}

/** Editorial subtitle for a category heading. */
export function getCategorySubtitle(name: string): string {
  const key = name.toLowerCase();

  const map: Record<string, string> = {
    biryani: "Traditional dum-cooked rice specialities",
    soups: "Warm, aromatic beginnings",
    desserts: "Sweet finales crafted with care",
    naans: "Fresh from the tandoor",
    chai: "Slow-steeped, soul-warming brews",
    coffee: "Bold roasts and spiced pours",
    breakfast: "Morning flavours to start your day",
    mocktails: "Refreshing, alcohol-free creations",
    "soft drinks": "Classic refreshments",
    snacks: "Light bites and street-side favourites",
    pulavs: "Fragrant rice delicacies",
    thali: "Complete meals on a single platter",
    trays: "Generous platters for sharing",
    "kebab and tandoori": "Smoky, char-grilled perfection",
    "vegetarian appetizers": "Plant-forward starters",
    "non vegetarian appetizers": "Bold flavours to begin",
    "vegetarian entrees": "Comforting vegetarian classics",
    "non vegetarian entrees": "Rich, slow-simmered favourites",
    "vegetarian rice & biryani": "Aromatic rice specialities",
    "dd specials": "House signatures you won't forget",
    "dd special mandi": "Slow-roasted mandi masterpieces",
    "dd family packs (to go only)": "Feast-sized portions for home",
    "grand opening buffet": "A celebratory spread for every palate",
    "kids menu": "Flavours the little ones will love",
    "cooker pulav": "One-pot rice comfort",
    "monday offers": "Weekly delights at special value",
  };

  for (const [needle, subtitle] of Object.entries(map)) {
    if (key.includes(needle)) return subtitle;
  }

  return "Curated selections from our kitchen";
}

/** Filter menu data by search query and optional category id. */
export function filterMenuData(
  data: MenuData,
  query: string,
  categoryId: string | null
): MenuCategory[] {
  const normalizedQuery = query.trim().toLowerCase();

  return data.categories
    .filter((cat) => !categoryId || cat.id === categoryId)
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => {
        if (!normalizedQuery) return true;
        return (
          item.name.toLowerCase().includes(normalizedQuery) ||
          item.description.toLowerCase().includes(normalizedQuery) ||
          cat.name.toLowerCase().includes(normalizedQuery) ||
          item.category.toLowerCase().includes(normalizedQuery)
        );
      }),
    }))
    .filter((cat) => cat.items.length > 0);
}

export function flattenItems(categories: MenuCategory[]): MenuItem[] {
  return categories.flatMap((cat) => cat.items);
}
