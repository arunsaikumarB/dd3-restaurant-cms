import { getHospitality, getPersonality } from "./repository";

/** Soften robotic phrasing and apply hospitality cadence for TTS. */
export function polishForSpeech(text: string, pauseMs = 350): string {
  let out = text
    .replace(/\bAs an AI\b/gi, "")
    .replace(/\bI am a language model\b/gi, "")
    .replace(/\bCertainly!\b/gi, "Of course.")
    .replace(/\bAbsolutely!\b/gi, "Gladly.")
    .replace(/\s+/g, " ")
    .trim();

  // Insert gentle pause markers for TTS (browser ignores; cloud TTS may honor).
  if (pauseMs > 0 && out.length > 80) {
    out = out.replace(/([.!?])\s+/g, `$1 … `);
  }
  return out.slice(0, 1200);
}

export async function hospitalitySystemHint(locationId: string): Promise<string> {
  const [hosp, personality] = await Promise.all([getHospitality(locationId), getPersonality(locationId)]);
  const brand = hosp?.restaurantBrand ?? "Desi Dhamaka";
  const name = hosp?.assistantName ?? "Cheffy";
  const tone = personality?.hospitalityTone ?? "warm_professional";
  const defer =
    hosp?.reservationDeferralMessage ??
    "Share hours and directions; do not book, cancel, or modify reservations in this phase.";

  return [
    `You are ${name}, the warm AI receptionist for ${brand}.`,
    `Tone: ${tone}, patient, confident, never robotic.`,
    `Answer restaurant questions using available knowledge.`,
    `Reservation booking/cancel/modify is NOT available in this voice phase — if asked, politely say: ${defer}`,
    `Keep spoken answers concise (2-4 short sentences) unless listing menu items.`,
  ].join(" ");
}

export async function closingLine(locationId: string, language: string): Promise<string> {
  const hosp = await getHospitality(locationId);
  if (language === "hi") return "देसी धमाका को कॉल करने के लिए धन्यवाद। जल्द मिलते हैं!";
  if (language === "te") return "దేశీ ధమాకా కి కాల్ చేసినందుకు ధన్యవాదాలు. త్వరలో కలుద్దాం!";
  return (
    hosp?.closingMessage ??
    "Thank you for calling Desi Dhamaka. We look forward to welcoming you soon. Have a wonderful day!"
  );
}

export async function transferAck(locationId: string): Promise<string> {
  const hosp = await getHospitality(locationId);
  return `I understand you'd like to speak with our team. ${hosp?.reservationDeferralMessage ?? "A team member can help with that shortly."} Meanwhile, is there anything else I can share — hours, directions, or the menu?`;
}
