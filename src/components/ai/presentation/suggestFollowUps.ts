import type { CMSKnowledge } from "../../../services/cms/knowledge";
import type { GuestSessionProfile } from "../../../services/ai/personality/types";
import { detectConversationTopic } from "./detectTopic";
import type { ConversationTopic, FollowUpSuggestion } from "./types";

const FOLLOW_UPS: Record<ConversationTopic, FollowUpSuggestion[]> = {
  offers: [
    { id: "order", label: "🛵 Order online?", prompt: "I'd like to order online." },
    { id: "menu", label: "🍛 See the menu?", prompt: "Show me the menu." },
  ],
  location: [
    { id: "directions", label: "📍 Get directions?", prompt: "How do I get directions?" },
    { id: "hours", label: "🕒 What are your hours?", prompt: "What are your hours?" },
  ],
  contact: [
    { id: "call", label: "☎ Call the restaurant?", prompt: "What's the phone number?" },
    { id: "reserve", label: "📅 Reserve a table?", prompt: "I'd like to reserve a table." },
  ],
  hours: [
    { id: "reserve", label: "📅 Reserve a table?", prompt: "I'd like to reserve a table." },
    { id: "order", label: "🛵 Order online?", prompt: "I want to order online." },
  ],
  menu: [
    { id: "veg", label: "🌱 Vegetarian options?", prompt: "What vegetarian options do you have?" },
    { id: "order", label: "🛵 Order now?", prompt: "I want to order online." },
  ],
  recommend: [
    { id: "order", label: "🛵 Ready to order?", prompt: "I'd like to order online." },
    { id: "offers", label: "🎉 Today's offers?", prompt: "What offers are available today?" },
  ],
  catering: [
    { id: "contact", label: "☎ Talk to our team?", prompt: "How can I contact you about catering?" },
    { id: "party", label: "🎉 Party hall info?", prompt: "Tell me about your party hall." },
  ],
  gallery: [
    { id: "reserve", label: "📅 Plan a visit?", prompt: "I'd like to reserve a table." },
    { id: "menu", label: "🍛 Browse menu?", prompt: "Show me the menu." },
  ],
  reviews: [
    { id: "menu", label: "🍛 Try popular dishes?", prompt: "What are your most popular dishes?" },
    { id: "order", label: "🛵 Order online?", prompt: "I want to order online." },
  ],
  reservation: [
    { id: "directions", label: "📍 Get directions?", prompt: "How do I get there?" },
    { id: "menu", label: "🍛 Preview the menu?", prompt: "Show me the menu before I visit." },
  ],
  order: [
    { id: "offers", label: "🎉 Any offers today?", prompt: "What offers are available today?" },
    { id: "hours", label: "🕒 When are you open?", prompt: "What are your hours?" },
  ],
  general: [
    { id: "offers", label: "🎉 Today's offers?", prompt: "What offers are available today?" },
    { id: "directions", label: "📍 Directions?", prompt: "How do I get directions?" },
  ],
};

function preferenceFollowUps(prefs: GuestSessionProfile): FollowUpSuggestion[] {
  const extras: FollowUpSuggestion[] = [];
  if (prefs.guestMood === "hungry" || prefs.guestMood === "celebrating") {
    extras.push({ id: "recommend", label: "🍛 Recommendations?", prompt: "What do you recommend?" });
  }
  if (prefs.diningPurpose === "birthday" || prefs.diningPurpose === "anniversary") {
    extras.push({ id: "party", label: "🎉 Party options?", prompt: "Tell me about party and celebration options." });
  }
  if (prefs.cateringInterest) {
    extras.push({ id: "catering", label: "🍽 Catering details?", prompt: "Tell me more about catering." });
  }
  if (prefs.orderPreference === "delivery" || prefs.orderPreference === "pickup") {
    extras.push({ id: "order", label: "🛵 Order online?", prompt: "I want to order online." });
  }
  return extras;
}

export function suggestFollowUps(
  userMessage: string,
  _knowledge: CMSKnowledge | null,
  prefs: GuestSessionProfile = {},
): FollowUpSuggestion[] {
  const topic = (prefs.lastTopic as ConversationTopic | undefined) || detectConversationTopic(userMessage);
  let suggestions = [...(FOLLOW_UPS[topic] ?? FOLLOW_UPS.general)];

  if (prefs.dietary === "vegetarian" || prefs.dietary === "vegan") {
    suggestions = suggestions.filter((s) => s.id !== "veg");
    if (topic === "menu" || topic === "recommend") {
      suggestions.unshift({
        id: "veg-rec",
        label: "🌱 More veg picks?",
        prompt: "Recommend more vegetarian dishes for me.",
      });
    }
  }

  if (prefs.spiceLevel === "spicy" && topic === "recommend") {
    suggestions.unshift({
      id: "spicy-rec",
      label: "🔥 Spicy favorites?",
      prompt: "Recommend spicy dishes for me.",
    });
  }

  const merged = [...preferenceFollowUps(prefs), ...suggestions];
  const seen = new Set<string>();
  const unique: FollowUpSuggestion[] = [];
  for (const item of merged) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
    if (unique.length >= 2) break;
  }

  return unique;
}
