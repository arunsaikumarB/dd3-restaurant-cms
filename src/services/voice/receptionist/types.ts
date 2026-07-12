/**
 * Voice Receptionist — conversation experience types.
 * Planner remains the intelligence; receptionist manages hospitality flow.
 */

export type ReceptionistIntentHint =
  | "greeting"
  | "restaurant_information"
  | "business_hours"
  | "address"
  | "directions"
  | "parking"
  | "menu_questions"
  | "vegetarian"
  | "vegan"
  | "popular_dishes"
  | "offers"
  | "buffet"
  | "reservation_inquiry"
  | "catering_inquiry"
  | "party_inquiry"
  | "order_status"
  | "contact_staff"
  | "speak_to_manager"
  | "unknown"
  | "language_switch"
  | "repeat"
  | "end_call"
  | "small_talk";

export type CallControl =
  | "mute"
  | "resume"
  | "repeat"
  | "restart"
  | "end_call"
  | "transfer_request";

export type SilenceStage = "none" | "soft" | "hold" | "end";

export type VoiceMemory = {
  customerName: string | null;
  previousQuestions: string[];
  currentGoal: string | null;
  language: string;
  locationId: string;
  plannerGoal: string | null;
  lastAssistantText: string | null;
  lastUserText: string | null;
  muted: boolean;
  turns: number;
  interruptions: number;
  silencePrompts: number;
  misunderstandings: number;
  languageSwitches: number;
  repeatRequests: number;
  detectedIntents: string[];
};

export type GreetingContext = {
  locationId: string;
  locationName: string;
  language: string;
  returningCustomer?: boolean;
  holidayKey?: string | null;
  festivalKey?: string | null;
  eventKey?: string | null;
  customerName?: string | null;
};

export type GreetingResult = {
  text: string;
  code: string;
  language: string;
  timeOfDay: string;
};

export type SilencePrompt = {
  stage: SilenceStage;
  text: string;
  shouldEndCall: boolean;
};

export type CallSummary = {
  id: string;
  sessionId: string;
  locationId: string;
  summary: string;
  topics: string[];
  detectedIntents: string[];
  knowledgeUsed: string[];
  plannerGoal: string | null;
  durationMs: number;
  language: string | null;
  sentiment: string | null;
  escalationRecommendation: string | null;
  createdAt: string;
};

export type PersonalityProfile = {
  locationId: string;
  speakingSpeed: number;
  pauseDurationMs: number;
  greetingStyle: string;
  closingStyle: string;
  energyLevel: string;
  hospitalityTone: string;
};

export type HospitalityProfile = {
  locationId: string;
  restaurantBrand: string;
  assistantName: string;
  namasteEnabled: boolean;
  neverRobotic: boolean;
  confirmUnderstanding: boolean;
  reservationDeferralMessage: string;
  closingMessage: string;
};

export type SilenceRules = {
  locationId: string;
  prompt5s: string;
  prompt10s: string;
  prompt20s: string;
  softPromptMs: number;
  holdPromptMs: number;
  endAfterMs: number;
};

export type ReceptionistTurnResult = {
  sessionId: string;
  handledLocally: boolean;
  control?: CallControl | null;
  userText: string;
  assistantText: string;
  spokenText: string;
  intent: string | null;
  plannerGoal: string | null;
  planId: string | null;
  confidence: number;
  language: string;
  memory: VoiceMemory;
  latency?: {
    sttMs: number;
    plannerMs: number;
    toolMs: number;
    geminiMs: number;
    reflectionMs: number;
    ttsMs: number;
    totalMs: number;
  };
  callState: string;
};

export type ReceptionistLiveState = {
  sessionId: string;
  callState: string;
  listening: boolean;
  speaking: boolean;
  intent: string | null;
  plannerGoal: string | null;
  confidence: number | null;
  language: string;
  durationMs: number;
  memory: VoiceMemory;
};
