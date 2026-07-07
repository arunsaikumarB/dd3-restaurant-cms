import type { CMSKnowledge } from "../../../services/cms/knowledge";
import type { GuestSessionProfile } from "../../../services/ai/personality/types";
import { detectConversationTopic } from "./detectTopic";
import type { PresentationCard } from "./types";

export function inferPresentationCards(
  userMessage: string,
  knowledge: CMSKnowledge | null,
  prefs: GuestSessionProfile = {},
): PresentationCard[] {
  if (!knowledge) return [];

  const topic = (prefs.lastTopic as import("./types").ConversationTopic | undefined) || detectConversationTopic(userMessage);
  const cards: PresentationCard[] = [];
  const settings = knowledge.modules.restaurantSettings.data;
  const location = knowledge.modules.locationSettings.data;
  const offers = knowledge.modules.offers.data ?? [];
  const nav = knowledge.navigation;

  if (topic === "offers" && offers.length > 0) {
    cards.push({
      kind: "offer",
      offers: offers.slice(0, 3),
      offerPath: nav.offers,
      orderPath: nav.order,
    });
  }

  if (topic === "location" || topic === "hours") {
    const hours = settings?.hours?.length ? settings.hours : location?.openingHours ?? [];
    cards.push({
      kind: "location",
      name: knowledge.locationName,
      address: settings?.address || location?.address || "",
      phone: settings?.phone || location?.phone || "",
      hours,
      mapsUrl: settings?.googleMaps,
      orderUrl: settings?.orderUrl || location?.orderDirectLink,
      websitePath: nav.home,
    });
  }

  if (topic === "contact") {
    cards.push({
      kind: "contact",
      phone: settings?.phone || location?.phone || "",
      email: settings?.email || location?.email || "",
      address: settings?.address || location?.address || "",
      mapsUrl: settings?.googleMaps,
    });
  }

  if (topic === "recommend" || topic === "menu" || prefs.guestMood === "hungry") {
    const items = [];

    if (prefs.dietary === "vegetarian" || prefs.dietary === "vegan") {
      items.push({
        id: "veg",
        emoji: "🌱",
        title: prefs.dietary === "vegan" ? "Vegan Favorites" : "Vegetarian Favorites",
        tag: "Matches your preference",
      });
    } else if (prefs.dietary === "non-vegetarian") {
      items.push({
        id: "nonveg",
        emoji: "🍗",
        title: "Non-Veg Favorites",
        tag: "Matches your preference",
      });
    } else {
      items.push({
        id: "popular",
        emoji: "🔥",
        title: "Guest Favorites",
        tag: "Highly recommended",
      });
    }

    if (prefs.spiceLevel === "spicy") {
      items.push({
        id: "spicy",
        emoji: "🌶️",
        title: "Spice Lover's Picks",
        tag: "Bold flavors you love",
      });
    } else if (prefs.spiceLevel === "mild") {
      items.push({
        id: "mild",
        emoji: "🍛",
        title: "Mild & Comforting",
        tag: "Gentle on spice",
      });
    } else {
      items.push({
        id: "thali",
        emoji: "🥘",
        title: "Signature Thalis",
        tag: prefs.familySize ? `Great for ${prefs.familySize} guests` : "Great for sharing",
      });
    }

    if (prefs.hasKids) {
      items.push({
        id: "kids",
        emoji: "👨‍👩‍👧",
        title: "Family & Kids",
        tag: "Kid-friendly choices",
      });
    }

    if (prefs.guestMood === "in-a-hurry") {
      items.push({
        id: "quick",
        emoji: "⚡",
        title: "Quick Bites",
        tag: "Perfect when you're in a hurry",
      });
    }

    if (
      prefs.diningPurpose === "celebration" ||
      prefs.diningPurpose === "birthday" ||
      prefs.diningPurpose === "anniversary"
    ) {
      items.push({
        id: "celebrate",
        emoji: "🎉",
        title: "Celebration Picks",
        tag: "Make it special",
      });
    }

    cards.push({
      kind: "recommendation",
      items: items.slice(0, 3),
      menuPath: nav.menu,
    });
  }

  return cards;
}
