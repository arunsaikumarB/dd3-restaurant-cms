/**
 * Catering / Event Engine smoke scenarios (QA Feature 17).
 * Run conceptually via runEventEngine — no live DB required for field extraction checks.
 */
import {
  detectCateringAction,
  detectMissingFields,
  extractEventRequirements,
} from "./eventEngine";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

export function runCateringSmoke(): void {
  // New inquiry
  const inquire = extractEventRequirements(
    "Birthday for 40 guests on 2026-08-15, name is Priya Sharma, phone 7325551212, budget $2000",
    "south-plainfield",
  );
  assert(inquire.eventType === "birthday", "birthday type");
  assert(inquire.guestCount === 40, "guest count");
  assert(inquire.eventDate === "2026-08-15", "event date");
  assert(Boolean(inquire.phone), "phone");
  assert(inquire.customerName === "Priya Sharma", "name");
  assert(detectMissingFields(inquire).length === 0, "no missing fields");

  // Large wedding
  const wedding = extractEventRequirements(
    "Wedding reception for 120 people, non-veg, live counter, decorations and cake",
    "lawrenceville",
  );
  assert(wedding.eventType === "wedding" || wedding.eventType === "reception", "wedding/reception");
  assert((wedding.guestCount ?? 0) >= 120, "large wedding size");
  assert(wedding.needs?.liveCounter === true, "live counter");
  assert(wedding.needs?.decorations === true, "decor");
  assert(wedding.needs?.cake === true, "cake");

  // Corporate
  const corp = extractEventRequirements("Corporate office lunch buffet for 25 people", "oak-tree");
  assert(corp.eventType === "office_lunch" || corp.eventType === "corporate" || corp.eventType === "buffet", "corp type");
  assert(detectCateringAction("Please send a quotation") === "quote", "quote action");
  assert(detectCateringAction("revise the quote") === "revise", "revise action");
  assert(detectCateringAction("cancel the event") === "cancel", "cancel action");

  // Budget too low signal still extracts budget
  const low = extractEventRequirements("Festival for 80 guests budget $400", "south-plainfield");
  assert(low.budget === 400, "budget parsed");

  // Custom dietary
  const jain = extractEventRequirements("Jain vegetarian private dining for 15 guests", "oak-tree");
  assert(jain.dietary?.includes("jain") || jain.dietary?.includes("veg"), "dietary");

  console.log("[catering.smoke] all assertions passed");
}

if (typeof process !== "undefined" && process.argv?.[1]?.includes("catering.smoke")) {
  runCateringSmoke();
}
