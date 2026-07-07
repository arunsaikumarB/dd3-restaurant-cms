import type { DiningPurpose, GuestMood } from "./types";

export function detectGuestMood(message: string): GuestMood {
  const q = message.toLowerCase();
  if (/hungry|starving|craving|need food|what should i eat/.test(q)) return "hungry";
  if (/celebrat|birthday|anniversary|party|special occasion|festival/.test(q)) return "celebrating";
  if (/hurry|rush|quick|fast|asap|short on time/.test(q)) return "in-a-hurry";
  if (/thank|thanks|appreciate|grateful/.test(q)) return "grateful";
  if (/how are you|good (morning|evening|afternoon)|see you|bye|goodbye/.test(q)) return "curious";
  if (/browse|explore|just looking|curious/.test(q)) return "browsing";
  return "neutral";
}

export function detectDiningPurpose(message: string): DiningPurpose | undefined {
  const q = message.toLowerCase();
  if (/birthday/.test(q)) return "birthday";
  if (/anniversary/.test(q)) return "anniversary";
  if (/office|work lunch|team lunch|colleague/.test(q)) return "office-lunch";
  if (/cater/.test(q)) return "catering";
  if (/celebrat|special occasion|graduation/.test(q)) return "celebration";
  if (/family|kids|children|parents/.test(q)) return "family";
  if (/date night|romantic|couple/.test(q)) return "date";
  if (/casual|friends|hangout/.test(q)) return "casual";
  return undefined;
}

export function isSmallTalk(message: string): boolean {
  const q = message.trim().toLowerCase();
  return /^(hi|hello|hey|namaste|good (morning|afternoon|evening)|how are you|thank you|thanks|see you|bye|goodbye)[!.?\s]*$/.test(
    q,
  );
}

export function isFarewell(message: string): boolean {
  const q = message.toLowerCase();
  return /bye|goodbye|see you|talk later|that's all|thank you|thanks for/.test(q);
}
