export type CheffyActionItem = {
  label: string;
  prompt: string;
  emoji?: string;
};

export const INPUT_QUICK_CHIPS: CheffyActionItem[] = [
  { label: "🍛 Menu", prompt: "Show me the menu." },
  { label: "🎉 Offers", prompt: "What offers are available today?" },
  { label: "📍 Directions", prompt: "How do I get directions?" },
  { label: "☎ Call", prompt: "What's the phone number?" },
  { label: "🕒 Hours", prompt: "What are your hours?" },
  { label: "🍽 Catering", prompt: "Tell me about catering options." },
  { label: "⭐ Reviews", prompt: "What do guests say about you?" },
  { label: "📷 Gallery", prompt: "Show me your gallery." },
  { label: "🛵 Order", prompt: "I want to order online." },
];

export const DASHBOARD_TILES: Array<CheffyActionItem & { emoji: string }> = [
  { emoji: "🍛", label: "View Live Menu", prompt: "Show me the menu." },
  { emoji: "🎉", label: "Today's Offers", prompt: "What offers are available today?" },
  { emoji: "🛵", label: "Order Online", prompt: "I want to order online." },
  { emoji: "📍", label: "Directions", prompt: "How do I get directions?" },
  { emoji: "☎", label: "Call", prompt: "What's the phone number?" },
  { emoji: "🕒", label: "Hours", prompt: "What are your hours?" },
  { emoji: "📷", label: "Gallery", prompt: "Show me your gallery." },
  { emoji: "⭐", label: "Reviews", prompt: "What do guests say about you?" },
  { emoji: "🍽", label: "Catering", prompt: "Tell me about catering options." },
  { emoji: "📅", label: "Reserve Table", prompt: "I'd like to reserve a table." },
];

export const HOME_QUICK_ACTIONS: CheffyActionItem[] = [
  { label: "🍛 Recommend Food", prompt: "Can you recommend some popular dishes?" },
  { label: "📅 Reserve Table", prompt: "I'd like to reserve a table." },
  { label: "🛵 Order Online", prompt: "I want to order online." },
  { label: "🎉 Catering", prompt: "Tell me about catering options." },
  { label: "📍 Locations", prompt: "What are your locations?" },
  { label: "🎁 Today's Offers", prompt: "What offers are available today?" },
  { label: "☎ Contact", prompt: "How can I contact the restaurant?" },
  { label: "❓ FAQ", prompt: "What can you help me with?" },
];

export const POPULAR_TOPICS: CheffyActionItem[] = [
  { label: "🎉 Today's Offers", prompt: "What offers are available today?" },
  { label: "🍛 Menu Highlights", prompt: "What are your most popular dishes?" },
  { label: "🕒 Hours & Buffet", prompt: "What are your buffet timings?" },
  { label: "📍 Visit Us", prompt: "How do I get directions?" },
];

export const SUGGESTED_QUESTIONS: CheffyActionItem[] = [
  { label: "Today's Specials", prompt: "What are today's specials?" },
  { label: "Most Popular Dish", prompt: "What is your most popular dish?" },
  { label: "Vegetarian Food", prompt: "What vegetarian options do you have?" },
  { label: "Reserve Table", prompt: "How do I reserve a table?" },
  { label: "Buffet Timings", prompt: "What are your buffet timings?" },
  { label: "Current Offers", prompt: "Show me current offers." },
  { label: "Kids Menu", prompt: "Do you have a kids menu?" },
  { label: "Catering", prompt: "Tell me about catering services." },
  { label: "Party Hall", prompt: "Do you have a party hall for events?" },
];
