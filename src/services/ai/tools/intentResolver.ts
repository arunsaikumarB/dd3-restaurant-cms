import { detectIntent, type CheffyIntent } from "../emotionEngine";
import { getToolsForIntents } from "./registry";
import type { ToolName, ToolPlan } from "./types";

const CLAUSE_SPLIT = /\?|(?:\band\b|\balso\b|\bplus\b|\bthen\b)/i;

const COMPOUND_PATTERNS: Array<{ test: RegExp; intents: CheffyIntent[] }> = [
  {
    test: /offer|deal|promo|special/i,
    intents: ["offers"],
  },
  {
    test: /where|located|address|direction|find you/i,
    intents: ["location", "contact"],
  },
  {
    test: /hour|open|close|timing/i,
    intents: ["hours"],
  },
  {
    test: /gallery|photo|picture/i,
    intents: ["gallery"],
  },
  {
    test: /review|testimonial|rating|customer say/i,
    intents: ["faq"],
  },
  {
    test: /about|story|who are you|tell me about/i,
    intents: ["greeting"],
  },
  {
    test: /cater|party|event/i,
    intents: ["catering", "party"],
  },
  {
    test: /menu|dish|food|eat|vegetarian|vegan/i,
    intents: ["menu", "recommend"],
  },
  {
    test: /order|delivery|pickup|online/i,
    intents: ["order"],
  },
  {
    test: /reserv|book a table|table for/i,
    intents: ["reservation"],
  },
];

function splitClauses(message: string): string[] {
  const parts = message
    .split(CLAUSE_SPLIT)
    .map((part) => part.trim())
    .filter((part) => part.length > 2);
  return parts.length > 0 ? parts : [message.trim()];
}

/** Detects one or more intents from a message (multi-clause + compound patterns). */
export function detectIntents(message: string): CheffyIntent[] {
  const found = new Set<CheffyIntent>();
  const clauses = splitClauses(message);

  for (const clause of clauses) {
    found.add(detectIntent(clause));
    for (const pattern of COMPOUND_PATTERNS) {
      if (pattern.test.test(clause)) {
        for (const intent of pattern.intents) {
          found.add(intent);
        }
      }
    }
  }

  for (const pattern of COMPOUND_PATTERNS) {
    if (pattern.test.test(message)) {
      for (const intent of pattern.intents) {
        found.add(intent);
      }
    }
  }

  if (found.size === 0) {
    found.add(detectIntent(message));
  }

  return [...found];
}

/** Builds an execution plan: intents → prioritized unique tools. */
export function resolveToolPlan(message: string): ToolPlan {
  const intents = detectIntents(message);
  const tools = getToolsForIntents(intents);
  return { intents, tools };
}

/** @deprecated Use resolveToolPlan — kept for backward compatibility. */
export function selectToolsForMessage(message: string): ToolName[] {
  return resolveToolPlan(message).tools;
}

export function mapLegacyToolName(name: string): ToolName | null {
  const map: Record<string, ToolName> = {
    getRestaurantSettings: "getRestaurantInfo",
    getHomepage: "getHomepageContent",
    getRestaurantInfo: "getRestaurantInfo",
    getHomepageContent: "getHomepageContent",
    getOffers: "getOffers",
    getGallery: "getGallery",
    getReviews: "getReviews",
    getSEO: "getSEO",
    getCurrentLocation: "getCurrentLocation",
    navigateToPage: "navigateToPage",
  };
  return map[name] ?? null;
}
