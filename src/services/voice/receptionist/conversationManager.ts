import type { CallControl, ReceptionistIntentHint, VoiceMemory } from "./types";

const memoryBySession = new Map<string, VoiceMemory>();

export function getOrCreateMemory(sessionId: string, locationId: string, language: string): VoiceMemory {
  const existing = memoryBySession.get(sessionId);
  if (existing) return existing;
  const mem: VoiceMemory = {
    customerName: null,
    previousQuestions: [],
    currentGoal: null,
    language,
    locationId,
    plannerGoal: null,
    lastAssistantText: null,
    lastUserText: null,
    muted: false,
    turns: 0,
    interruptions: 0,
    silencePrompts: 0,
    misunderstandings: 0,
    languageSwitches: 0,
    repeatRequests: 0,
    detectedIntents: [],
  };
  memoryBySession.set(sessionId, mem);
  return mem;
}

export function clearMemory(sessionId: string): void {
  memoryBySession.delete(sessionId);
}

export function rememberUserTurn(mem: VoiceMemory, text: string, intent: string | null): void {
  mem.lastUserText = text;
  mem.turns += 1;
  mem.previousQuestions = [...mem.previousQuestions.slice(-11), text];
  if (intent && !mem.detectedIntents.includes(intent)) mem.detectedIntents.push(intent);
  const nameMatch = text.match(/(?:my name is|this is|i am|i'm)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (nameMatch?.[1]) mem.customerName = nameMatch[1];
}

export function rememberAssistantTurn(mem: VoiceMemory, text: string, plannerGoal: string | null): void {
  mem.lastAssistantText = text;
  if (plannerGoal) {
    mem.plannerGoal = plannerGoal;
    mem.currentGoal = plannerGoal;
  }
}

/** Lightweight local control detection — Planner still classifies real intents. */
export function detectLocalControl(text: string): CallControl | null {
  const t = text.toLowerCase().trim();
  if (/^(goodbye|bye|end (the )?call|hang up|that's all|that is all)\b/.test(t) || t.includes("end the call")) {
    return "end_call";
  }
  if (/\b(mute|stop listening)\b/.test(t)) return "mute";
  if (/\b(unmute|resume|continue)\b/.test(t)) return "resume";
  if (/\b(repeat|say that again|what did you say)\b/.test(t)) return "repeat";
  if (/\b(start over|restart|begin again)\b/.test(t)) return "restart";
  if (/\b(transfer|speak to (a )?manager|talk to (a )?person|human|staff)\b/.test(t)) {
    return "transfer_request";
  }
  return null;
}

export function hintIntentFromText(text: string): ReceptionistIntentHint {
  const t = text.toLowerCase();
  if (/\b(hours?|open|close|closing)\b/.test(t)) return "business_hours";
  if (/\b(address|where are you|location)\b/.test(t)) return "address";
  if (/\b(direction|how (do|to) (i )?get|navigate)\b/.test(t)) return "directions";
  if (/\bpark(ing)?\b/.test(t)) return "parking";
  if (/\bvegan\b/.test(t)) return "vegan";
  if (/\bvegetarian|veg\b/.test(t)) return "vegetarian";
  if (/\b(buffet)\b/.test(t)) return "buffet";
  if (/\b(offer|special|discount|promo)\b/.test(t)) return "offers";
  if (/\b(popular|best|signature|recommend)\b/.test(t)) return "popular_dishes";
  if (/\b(menu|dish|food|biryani|curry)\b/.test(t)) return "menu_questions";
  if (/\b(reserv|book(ing)? a table|table for)\b/.test(t)) return "reservation_inquiry";
  if (/\b(cater(ing)?)\b/.test(t)) return "catering_inquiry";
  if (/\b(party|private dining|event)\b/.test(t)) return "party_inquiry";
  if (/\b(order status|my order)\b/.test(t)) return "order_status";
  if (/\b(manager|staff|human)\b/.test(t)) return "speak_to_manager";
  if (/^(hi|hello|namaste|hey)\b/.test(t)) return "greeting";
  if (/\b(telugu|hindi|english)\b/.test(t) && /\b(speak|continue|switch|in)\b/.test(t)) {
    return "language_switch";
  }
  return "unknown";
}
