import type { CMSKnowledge } from "../../cms/knowledge";
import type { CheffyActionItem } from "../../../components/ai/cheffyActions";
import { detectTopicFromMessage } from "./topicDetector";
import type { GuestSessionProfile } from "./types";

const BASE_CHIPS: CheffyActionItem[] = [
  { label: "🍛 Menu", prompt: "Show me the menu." },
  { label: "🎉 Offers", prompt: "What offers are available today?" },
  { label: "📍 Directions", prompt: "How do I get directions?" },
  { label: "☎ Call", prompt: "What's the phone number?" },
  { label: "🛵 Order", prompt: "I want to order online." },
];

const TOPIC_CHIPS: Record<string, CheffyActionItem[]> = {
  offers: [
    { label: "🛵 Order Online", prompt: "I want to order online." },
    { label: "🍛 View Live Menu", prompt: "Show me the menu." },
  ],
  location: [
    { label: "🕒 Hours", prompt: "What are your hours?" },
    { label: "📅 Reserve", prompt: "I'd like to reserve a table." },
  ],
  hours: [
    { label: "📅 Reserve", prompt: "I'd like to reserve a table." },
    { label: "🛵 Order", prompt: "I want to order online." },
  ],
  catering: [
    { label: "☎ Contact", prompt: "How can I contact you about catering?" },
    { label: "🎉 Party Hall", prompt: "Tell me about your party hall." },
  ],
  menu: [
    { label: "🌱 Vegetarian", prompt: "What vegetarian options do you have?" },
    { label: "🔥 Popular", prompt: "What are your most popular dishes?" },
  ],
  recommend: [
    { label: "🎉 Offers", prompt: "What offers are available today?" },
    { label: "🛵 Order", prompt: "I want to order online." },
  ],
  order: [
    { label: "🎉 Offers", prompt: "What offers are available today?" },
    { label: "🕒 Hours", prompt: "What are your hours?" },
  ],
};

export function suggestInputChips(
  lastUserMessage = "",
  profile: GuestSessionProfile = {},
  _knowledge?: CMSKnowledge | null,
): CheffyActionItem[] {
  const topic = profile.lastTopic || detectTopicFromMessage(lastUserMessage);
  const topicChips = TOPIC_CHIPS[topic] ?? [];

  const prefChips: CheffyActionItem[] = [];
  if (profile.dietary === "vegetarian" && topic !== "menu") {
    prefChips.push({ label: "🌱 Veg Picks", prompt: "Recommend vegetarian dishes for me." });
  }
  if (profile.spiceLevel === "spicy") {
    prefChips.push({ label: "🔥 Spicy Picks", prompt: "Recommend spicy dishes for me." });
  }
  if (profile.hasKids) {
    prefChips.push({ label: "👨‍👩‍👧 Family", prompt: "What do you recommend for families with kids?" });
  }
  if (profile.cateringInterest || profile.diningPurpose === "catering") {
    prefChips.push({ label: "🍽 Catering", prompt: "Tell me about catering options." });
  }
  if (profile.guestMood === "in-a-hurry") {
    prefChips.push({ label: "⚡ Quick Bite", prompt: "I'm in a hurry — what do you suggest?" });
  }

  const merged = [...topicChips, ...prefChips, ...BASE_CHIPS];
  const seen = new Set<string>();
  const unique: CheffyActionItem[] = [];

  for (const chip of merged) {
    if (seen.has(chip.prompt)) continue;
    seen.add(chip.prompt);
    unique.push(chip);
    if (unique.length >= 8) break;
  }

  return unique;
}
