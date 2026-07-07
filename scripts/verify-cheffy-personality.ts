/**
 * Smoke tests for Cheffy personality & guest memory (run: npx tsx scripts/verify-cheffy-personality.ts)
 */
import {
  buildMascotGreeting,
  buildPersonalityDirectives,
  detectGuestMood,
  isReturningVisitor,
  isSmallTalk,
  updateGuestProfileFromMessage,
  suggestInputChips,
  buildRecommendationHints,
} from "../src/services/ai/personality";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

assert(detectGuestMood("I'm so hungry") === "hungry", "hungry mood");
assert(detectGuestMood("we're celebrating a birthday") === "celebrating", "celebrating mood");
assert(isSmallTalk("thank you!"), "small talk thanks");

let profile = updateGuestProfileFromMessage("I'm vegetarian");
assert(profile.dietary === "vegetarian", "vegetarian memory");

profile = updateGuestProfileFromMessage("I love spicy food", profile);
assert(profile.spiceLevel === "spicy", "spice memory");

profile = updateGuestProfileFromMessage("What should I order?", profile);
assert(profile.dietary === "vegetarian", "dietary persists");
assert(profile.spiceLevel === "spicy", "spice persists");

const returning = { ...profile, userMessageCount: 2 };
assert(isReturningVisitor(returning), "returning visitor");
const greeting = buildMascotGreeting(null, returning);
assert(greeting.includes("Welcome back"), "returning greeting");

const directives = buildPersonalityDirectives(profile, "I'm vegetarian", "South Plainfield");
assert(directives.includes("vegetarian"), "directives include dietary");
assert(directives.includes("South Plainfield"), "directives include location");

const recHints = buildRecommendationHints(profile);
assert(recHints.includes("vegetarian"), "recommendation hints");

const chips = suggestInputChips("show menu", profile);
assert(chips.length >= 3, "dynamic chips");

console.log("verify-cheffy-personality: all checks passed");
