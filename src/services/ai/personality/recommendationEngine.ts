import type { CMSKnowledge } from "../../cms/knowledge";
import { getTimeOfDay } from "./greetings";
import type { GuestSessionProfile, RecommendationContext } from "./types";

/**
 * Recommendation architecture — ready for future Menu / ChefGaa integration.
 * Today: builds guidance hints from session profile + CMS signals only.
 */
export function buildRecommendationContext(
  profile: GuestSessionProfile,
  knowledge?: CMSKnowledge | null,
): RecommendationContext {
  return {
    dietary: profile.dietary,
    spiceLevel: profile.spiceLevel,
    budget: profile.budget,
    familySize: profile.familySize,
    diningPurpose: profile.diningPurpose,
    mealTime: getTimeOfDay(),
    locationName: knowledge?.locationName,
    hasOffers: Boolean(knowledge?.modules.offers.data?.length),
  };
}

export function buildRecommendationHints(
  profile: GuestSessionProfile,
  knowledge?: CMSKnowledge | null,
): string {
  const ctx = buildRecommendationContext(profile, knowledge);
  const hints: string[] = [
    "RECOMMENDATION GUIDANCE (menu not connected — suggest categories only, never invent dishes or prices):",
  ];

  if (ctx.dietary === "vegetarian" || ctx.dietary === "vegan") {
    hints.push("- Lead with vegetarian/vegan-friendly categories (paneer, dal, veg curries, breads).");
  } else if (ctx.dietary === "non-vegetarian") {
    hints.push("- Include popular non-veg categories (biryani, kebabs, curries) without naming specific unavailable items.");
  }

  if (ctx.spiceLevel === "spicy") {
    hints.push("- Guest loves spice — mention bold, flavorful options.");
  } else if (ctx.spiceLevel === "mild") {
    hints.push("- Guest prefers milder flavors — mention customizable spice levels.");
  }

  if (ctx.familySize && ctx.familySize >= 4) {
    hints.push("- Suggest family platters, thalis, or sharing-style meals.");
  }

  if (profile.hasKids) {
    hints.push("- Mention kid-friendly, mild options suitable for children.");
  }

  if (ctx.diningPurpose === "celebration" || ctx.diningPurpose === "birthday") {
    hints.push("- Highlight desserts, party hall, or catering for celebrations.");
  }

  if (profile.guestMood === "in-a-hurry") {
    hints.push("- Prioritize quick lunch combos, takeaway, or online ordering.");
  }

  if (ctx.mealTime === "morning" || ctx.mealTime === "afternoon") {
    hints.push("- Consider lunch specials and weekday offers if available in tool results.");
  }

  if (ctx.hasOffers) {
    hints.push("- Mention today's offers from tool results when recommending.");
  }

  hints.push("- When Menu tool is available, use live dish data. Until then, guide to the menu page.");
  return hints.join("\n");
}

/** @future Plug MenuTool / ChefGaa results here. */
export type MenuRecommendationInput = {
  locationId: string;
  profile: GuestSessionProfile;
  menuItems?: never;
};

export function recommendDishes(_input: MenuRecommendationInput): never {
  throw new Error("Menu recommendations require Menu tool integration.");
}
