import type { CMSKnowledge } from "./types";
import { moduleLabel } from "./query";

export function unavailableForModule(
  knowledge: CMSKnowledge,
  moduleName: string,
  suggestion?: string,
): string {
  const location = knowledge.locationName;
  const restaurant = knowledge.modules.restaurantSettings.data;
  const contactHint = restaurant?.phone
    ? ` You can reach us at **${restaurant.phone}**.`
    : restaurant?.email
      ? ` You can email us at **${restaurant.email}**.`
      : "";

  const tail = suggestion ? ` ${suggestion}` : "";
  return `I don't have **${moduleName}** information available for **${location}** right now.${contactHint}${tail}`;
}

export function unavailableMenu(knowledge: CMSKnowledge): string {
  const restaurant = knowledge.modules.restaurantSettings.data;
  const location = knowledge.modules.locationSettings.data;
  const orderUrl =
    restaurant?.orderUrl?.trim() ||
    location?.orderDirectLink?.trim() ||
    knowledge.navigation.menu;

  return `Our full **live menu** with current items and prices is available through **ChefGaa online ordering** for **${knowledge.locationName}**.\n\n[BUTTON:View Live Menu|${orderUrl}]`;
}

export function unavailableGeneric(knowledge: CMSKnowledge): string {
  const homepage = knowledge.modules.homepage.data;
  if (homepage?.aboutDescription) {
    return `Here's what I can share from our homepage at **${knowledge.locationName}**:\n\n${homepage.aboutDescription}`;
  }
  return unavailableForModule(
    knowledge,
    "that",
    "Try asking about hours, offers, gallery, reviews, or contact details.",
  );
}

export function formatModuleCapabilities(knowledge: CMSKnowledge): string {
  const available = (Object.keys(knowledge.modules) as (keyof typeof knowledge.modules)[])
    .filter((key) => knowledge.modules[key].available)
    .map((key) => moduleLabel(key));

  if (!available.length) {
    return unavailableForModule(knowledge, "CMS", "Please check back shortly.");
  }

  return `I can help using live **${knowledge.locationName}** content from: ${available.join(", ")}. What would you like to know?`;
}
