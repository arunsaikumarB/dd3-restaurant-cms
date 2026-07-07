import type { CheffyEmotion } from "../../components/ai/CheffyEmotion";

export type CheffyIntent =
  | "menu"
  | "vegetarian"
  | "offers"
  | "reservation"
  | "catering"
  | "order"
  | "recommend"
  | "hours"
  | "contact"
  | "location"
  | "greeting"
  | "faq"
  | "kids"
  | "party"
  | "buffet"
  | "gallery"
  | "unknown";

export function detectIntent(message: string): CheffyIntent {
  const q = message.toLowerCase();
  if (/\b(hi|hello|hey|namaste|good (morning|evening|afternoon))\b/.test(q)) return "greeting";
  if (/gallery|photos?|pictures?/.test(q)) return "gallery";
  if (/buffet/.test(q)) return "buffet";
  if (/kids?.? menu|children|kid.?friendly/.test(q)) return "kids";
  if (/party hall|banquet|private (room|dining)|event space/.test(q)) return "party";
  if (/faq|help me with|what can you/.test(q)) return "faq";
  if (/hour|open|close|timing|time do you/.test(q)) return "hours";
  if (/vegetarian|vegan|\bveg\b|paneer/.test(q)) return "vegetarian";
  if (/offer|deal|promo|discount|special/.test(q)) return "offers";
  if (/reserve|table|booking|book a/.test(q)) return "reservation";
  if (/cater|party|parties|event|birthday/.test(q)) return "catering";
  if (/order|delivery|pickup|takeout|online/.test(q)) return "order";
  if (/recommend|suggest|popular|best|famous|chef|combo|dessert|drink|special/.test(q))
    return "recommend";
  if (/phone|call|contact|email|address|direction|parking|where are/.test(q)) return "contact";
  if (/oak.?tree|old bridge|lawrence|plainfield|location|switch/.test(q)) return "location";
  if (/menu|dish|food|biryani|curry|mandi|kebab|starter/.test(q)) return "menu";
  return "unknown";
}

export function intentToEmotion(intent: CheffyIntent): CheffyEmotion {
  switch (intent) {
    case "greeting":
      return "greeting";
    case "recommend":
    case "menu":
    case "vegetarian":
      return "idle";
    case "offers":
    case "catering":
    case "party":
      return "celebrating";
    case "reservation":
    case "order":
      return "listening";
    default:
      return "thinking";
  }
}
