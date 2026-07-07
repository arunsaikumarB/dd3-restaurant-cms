import type { GuestSessionProfile, SpicePreference } from "./types";
import { readSessionPreferences, writeSessionPreferences } from "../sessionMemory";
import { detectDiningPurpose, detectGuestMood } from "./emotionDetector";
import { detectTopicFromMessage } from "./topicDetector";

const VISIT_COUNT_KEY = "cheffy_user_message_count";

export function readGuestProfile(): GuestSessionProfile {
  return readSessionPreferences() as GuestSessionProfile;
}

export function writeGuestProfile(profile: GuestSessionProfile): void {
  writeSessionPreferences(profile);
}

function readMessageCount(): number {
  try {
    const raw = sessionStorage.getItem(VISIT_COUNT_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

function writeMessageCount(count: number): void {
  try {
    sessionStorage.setItem(VISIT_COUNT_KEY, String(count));
  } catch {
    /* ignore */
  }
}

/** Increments per-session message count for returning-visitor greetings. */
export function recordGuestInteraction(): number {
  const count = readMessageCount() + 1;
  writeMessageCount(count);
  return count;
}

function detectSpicePreference(message: string): SpicePreference | undefined {
  const q = message.toLowerCase();
  if (/extra spicy|very spicy|love spicy|spice lover|hot food/.test(q)) return "spicy";
  if (/mild|less spice|not too spicy|medium spice/.test(q)) return "mild";
  if (/medium spice|some heat/.test(q)) return "medium";
  return undefined;
}

function detectOrderPreference(message: string): GuestSessionProfile["orderPreference"] {
  const q = message.toLowerCase();
  if (/delivery|deliver/.test(q)) return "delivery";
  if (/pickup|pick up|takeaway|take out/.test(q)) return "pickup";
  if (/dine.?in|eat in|visit|table/.test(q)) return "dine-in";
  return undefined;
}

function detectFavoriteDish(message: string): string | undefined {
  const match = message.match(/love (the )?([a-z\s]+)|favorite (is|dish)?\s*([a-z\s]+)/i);
  const dish = match?.[2] || match?.[4];
  return dish?.trim().slice(0, 48);
}

/**
 * Extracts session-only guest preferences from natural language.
 * Never stores names, phone numbers, or permanent PII.
 */
export function updateGuestProfileFromMessage(
  message: string,
  current: GuestSessionProfile = {},
): GuestSessionProfile {
  const q = message.toLowerCase();
  const next: GuestSessionProfile = { ...current };

  if (/vegan/.test(q)) next.dietary = "vegan";
  else if (/vegetarian|\bveg\b|paneer/.test(q)) next.dietary = "vegetarian";
  else if (/non-?veg|meat|chicken|lamb|goat/.test(q)) next.dietary = "non-vegetarian";

  const spice = detectSpicePreference(message);
  if (spice) next.spiceLevel = spice;

  const budgetMatch = q.match(/budget\s*(under|around|about)?\s*\$?\s*(\d+)/);
  if (budgetMatch) next.budget = `$${budgetMatch[2]}`;

  const familyMatch = q.match(/(\d+)\s*(people|guests|diners|of us|family members)/);
  if (familyMatch) next.familySize = Number(familyMatch[1]);

  if (/kids?|children|child/.test(q)) {
    next.hasKids = true;
    if (!next.familySize) next.familySize = 4;
  }

  const purpose = detectDiningPurpose(message);
  if (purpose) next.diningPurpose = purpose;

  if (/cater/.test(q)) next.cateringInterest = true;

  const orderPref = detectOrderPreference(message);
  if (orderPref) next.orderPreference = orderPref;

  const favorite = detectFavoriteDish(message);
  if (favorite && favorite.length > 2) next.favoriteDish = favorite;

  next.guestMood = detectGuestMood(message);
  next.lastTopic = detectTopicFromMessage(message);
  next.userMessageCount = readMessageCount();

  return next;
}
