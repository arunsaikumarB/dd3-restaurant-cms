import type { PlannerIntent } from "./types";

export type IntentAnalysis = {
  primary: PlannerIntent;
  secondary: PlannerIntent[];
  signals: string[];
};

type Rule = { intent: PlannerIntent; pattern: RegExp; signal: string };

const RULES: Rule[] = [
  { intent: "greeting", pattern: /\b(hi|hello|hey|namaste|good (morning|evening|afternoon))\b/i, signal: "greeting_phrase" },
  { intent: "complaint", pattern: /\b(complaint|complain|terrible|awful|disgusting|manager|refund|angry|unacceptable)\b/i, signal: "complaint_language" },
  { intent: "feedback", pattern: /\b(feedback|review my|rate (my|your)|suggestion for (you|the restaurant))\b/i, signal: "feedback_ask" },
  { intent: "cancel_reservation", pattern: /\b(cancel|cancellation).{0,40}\b(reservation|booking|table)\b|\b(reservation|booking|table).{0,40}\b(cancel|cancellation)\b/i, signal: "cancel_reservation" },
  { intent: "modify_reservation", pattern: /\b(change|modify|update|reschedule|move).{0,40}\b(reservation|booking|table)\b/i, signal: "modify_reservation" },
  { intent: "reservation", pattern: /\b(reserve|reservation|book(ing)? (a )?table|table for|need a table|forgot (my )?reservation)\b/i, signal: "reservation_keywords" },
  { intent: "catering", pattern: /\b(cater|catering|corporate lunch|office lunch|bulk order)\b/i, signal: "catering_keywords" },
  { intent: "party_booking", pattern: /\b(party hall|banquet|private (room|dining|party)|event space|birthday (party|decor)|decorations?)\b/i, signal: "party_keywords" },
  { intent: "vegan", pattern: /\bvegan\b/i, signal: "vegan" },
  { intent: "vegetarian", pattern: /\b(vegetarian|\bveg\b|paneer|no meat)\b/i, signal: "vegetarian" },
  { intent: "kids_menu", pattern: /\b(kids?.? ?menu|children'?s? menu|kid.?friendly|for (my )?kids?)\b/i, signal: "kids_menu" },
  { intent: "dish_recommendation", pattern: /\b(recommend|suggest|something (spicy|mild)|what should i (eat|order)|popular|best|famous|chef'?s? (special|pick))\b/i, signal: "recommendation" },
  { intent: "menu_inquiry", pattern: /\b(menu|dish|food|biryani|curry|mandi|kebab|starter|appetizer)\b/i, signal: "menu" },
  { intent: "offers", pattern: /\b(offer|deal|promo|discount|special|coupon)\b/i, signal: "offers" },
  { intent: "hours", pattern: /\b(hours?|open|close[sd]?|timing|what time (do you|are you))\b/i, signal: "hours" },
  { intent: "directions", pattern: /\b(direction|how (do i|to) get|parking|where (are you|is the restaurant)|navigate)\b/i, signal: "directions" },
  { intent: "contact", pattern: /\b(phone|call|contact|email|reach (you|someone))\b/i, signal: "contact" },
  { intent: "gallery", pattern: /\b(gallery|photos?|pictures?|images?)\b/i, signal: "gallery" },
  { intent: "reviews", pattern: /\b(reviews?|ratings?|google review|what do people say)\b/i, signal: "reviews" },
  { intent: "order_status", pattern: /\b(order status|where is my order|track(ing)? (my )?order|delivery status)\b/i, signal: "order_status" },
  { intent: "restaurant_information", pattern: /\b(about (the )?restaurant|who (are|owns)|history|brand|desi dhamaka)\b/i, signal: "restaurant_info" },
];

/** Deterministic multi-intent analyzer — no LLM. */
export function analyzeIntents(message: string): IntentAnalysis {
  const q = message.trim();
  if (!q) {
    return { primary: "unknown", secondary: [], signals: ["empty_message"] };
  }

  const hits: Array<{ intent: PlannerIntent; signal: string; index: number }> = [];
  for (const rule of RULES) {
    const m = rule.pattern.exec(q);
    if (m) hits.push({ intent: rule.intent, signal: rule.signal, index: m.index });
  }

  if (!hits.length) {
    return { primary: "unknown", secondary: [], signals: ["no_rule_match"] };
  }

  hits.sort((a, b) => a.index - b.index);
  const unique: PlannerIntent[] = [];
  const signals: string[] = [];
  for (const h of hits) {
    if (!unique.includes(h.intent)) {
      unique.push(h.intent);
      signals.push(h.signal);
    }
  }

  // Prefer complaint / cancel / modify over broader reservation when both match
  const priority: PlannerIntent[] = [
    "complaint",
    "cancel_reservation",
    "modify_reservation",
    "reservation",
    "catering",
    "party_booking",
    "vegan",
    "vegetarian",
    "dish_recommendation",
    "order_status",
  ];
  let primary = unique[0]!;
  for (const p of priority) {
    if (unique.includes(p)) {
      primary = p;
      break;
    }
  }

  const secondary = unique.filter((i) => i !== primary);
  return { primary, secondary, signals };
}
