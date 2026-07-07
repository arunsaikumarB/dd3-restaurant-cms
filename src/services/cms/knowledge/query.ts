import type { CheffyIntent } from "../../ai/emotionEngine";
import type { CMSKnowledge, CMSModuleKey, CMSQueryResult } from "./types";

const INTENT_MODULES: Record<CheffyIntent, CMSModuleKey[]> = {
  hours: ["restaurantSettings", "locationSettings"],
  offers: ["offers"],
  contact: ["restaurantSettings", "locationSettings"],
  order: ["restaurantSettings", "locationSettings"],
  reservation: ["restaurantSettings", "locationSettings", "seo"],
  catering: ["seo", "homepage"],
  party: ["seo", "homepage"],
  location: ["locationSettings"],
  greeting: ["homepage", "seo"],
  faq: ["restaurantSettings", "homepage", "offers", "gallery", "reviews", "seo", "locationSettings"],
  menu: [],
  vegetarian: [],
  recommend: [],
  kids: [],
  buffet: ["restaurantSettings", "locationSettings", "seo"],
  gallery: ["gallery", "seo"],
  unknown: ["homepage", "offers", "reviews"],
};

/** Selects CMS module slices relevant to a user intent. */
export function queryCMSKnowledge(intent: CheffyIntent, knowledge: CMSKnowledge): CMSQueryResult {
  const modules = INTENT_MODULES[intent] ?? INTENT_MODULES.unknown;
  const payload: Record<string, unknown> = {
    locationId: knowledge.locationId,
    locationName: knowledge.locationName,
    navigation: knowledge.navigation,
  };

  for (const key of modules) {
    payload[key] = knowledge.modules[key];
  }

  return { modules, payload };
}

export function moduleLabel(key: CMSModuleKey): string {
  switch (key) {
    case "restaurantSettings":
      return "Restaurant Settings";
    case "homepage":
      return "Homepage";
    case "offers":
      return "Offers";
    case "gallery":
      return "Gallery";
    case "reviews":
      return "Reviews";
    case "seo":
      return "SEO";
    case "locationSettings":
      return "Location Settings";
    default:
      return key;
  }
}

export function listAvailableModules(knowledge: CMSKnowledge): CMSModuleKey[] {
  return (Object.keys(knowledge.modules) as CMSModuleKey[]).filter(
    (key) => knowledge.modules[key].available,
  );
}
