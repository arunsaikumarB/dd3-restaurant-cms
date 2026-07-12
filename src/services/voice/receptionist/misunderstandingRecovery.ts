import { getOrCreateMemory } from "./conversationManager";

const LOW_CONFIDENCE = 0.55;

export function shouldRecoverMisunderstanding(confidence: number | null | undefined): boolean {
  if (confidence == null) return false;
  return confidence < LOW_CONFIDENCE;
}

export function misunderstandingPrompt(language: string): string {
  if (language === "hi") {
    return "माफ़ कीजिए, मैं ठीक से सुन नहीं पाई। क्या आप फिर से कह सकते हैं?";
  }
  if (language === "te") {
    return "క్షమించండి, నాకు సరిగ్గా వినిపించలేదు. దయచేసి మళ్లీ చెప్పగలరా?";
  }
  return "I'm sorry, I didn't quite catch that. Could you please repeat it?";
}

export function noteMisunderstanding(sessionId: string, locationId: string, language: string): void {
  const mem = getOrCreateMemory(sessionId, locationId, language);
  mem.misunderstandings += 1;
}

export { LOW_CONFIDENCE };
