import type { DiningPurpose, GuestMood } from "./types";

export const HOSPITALITY_CLOSINGS = [
  "Have a wonderful meal! 🍛",
  "We look forward to serving you.",
  "Hope to see you soon!",
  "Enjoy every bite! ❤️",
];

export function moodResponseHint(mood: GuestMood): string {
  switch (mood) {
    case "hungry":
      return "Guest seems hungry — warmly recommend dishes and mention popular items when menu data is unavailable.";
    case "celebrating":
      return "Guest is celebrating — suggest desserts, party hall, catering, or special dining options with enthusiasm.";
    case "in-a-hurry":
      return "Guest is in a hurry — suggest quick lunch, takeaway, or online ordering.";
    case "grateful":
      return "Guest is thanking you — respond graciously and offer one gentle follow-up.";
    case "browsing":
      return "Guest is browsing — keep it light, welcoming, and offer gallery, menu, or offers.";
    default:
      return "";
  }
}

export function purposeResponseHint(purpose?: DiningPurpose): string {
  if (!purpose) return "";
  switch (purpose) {
    case "birthday":
      return "Acknowledge the birthday warmly and suggest celebration-friendly options.";
    case "anniversary":
      return "Congratulate them on their anniversary with warm hospitality.";
    case "family":
      return "Recommend family-friendly sharing meals and comfortable dining.";
    case "office-lunch":
      return "Suggest efficient group-friendly lunch options and catering if relevant.";
    case "catering":
      return "Guide toward catering services with enthusiasm.";
    case "celebration":
      return "Celebrate with the guest and suggest party or dessert options.";
    default:
      return "";
  }
}

export function pickClosingPhrase(): string {
  return HOSPITALITY_CLOSINGS[Math.floor(Math.random() * HOSPITALITY_CLOSINGS.length)];
}
