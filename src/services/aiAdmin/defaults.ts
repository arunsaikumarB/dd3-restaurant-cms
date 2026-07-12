import { CHEFFY_SYSTEM_PROMPT_CORE } from "../../config/ai/systemPrompt";
import type {
  AIAdvancedSettings,
  AIConversationSettings,
  AIGeneralSettings,
  AIKnowledgeSettings,
  AIPersonalityRow,
  AIProviderSettingsRow,
  AIRecommendationSettings,
  AISettingsRow,
} from "../../types/aiAdmin";

export const DEFAULT_GENERAL_SETTINGS: AIGeneralSettings = {
  ai_enabled: true,
  floating_assistant: true,
  welcome_animation: true,
  voice_greeting: false,
  typing_animation: true,
  recommendation_cards: true,
  follow_up_suggestions: true,
  dynamic_chips: true,
  conversation_memory: true,
  hospitality_personality: true,
  maintenance_mode: false,
  default_location_behavior: "visitor_selected",
};

export const DEFAULT_KNOWLEDGE_SETTINGS: AIKnowledgeSettings = {
  homepage: true,
  offers: true,
  gallery: true,
  reviews: true,
  seo: true,
  restaurant_settings: true,
  menu: false,
  reservations: false,
  chefgaa: false,
};

export const DEFAULT_CONVERSATION_SETTINGS: AIConversationSettings = {
  session_timeout_minutes: 30,
  memory_length: 12,
  max_messages: 40,
  context_window: 12,
  conversation_reset: "manual",
  welcome_back_duration_minutes: 30,
  typing_delay_ms: 550,
  streaming_speed: "normal",
};

export const DEFAULT_RECOMMENDATION_SETTINGS: AIRecommendationSettings = {
  family: true,
  vegetarian: true,
  spicy: true,
  kids: true,
  budget: true,
  celebration: true,
  office_lunch: true,
  menu_recommendations: false,
};

export const DEFAULT_ADVANCED_SETTINGS: AIAdvancedSettings = {
  cache_duration_seconds: 60,
  retry_attempts: 1,
  streaming_buffer_ms: 50,
  provider_failover: false,
  experimental_features: false,
  reflection_high_confidence_min: 0.85,
  reflection_medium_confidence_min: 0.55,
  reflection_escalate_below: 0.4,
  reflection_max_clarifications: 3,
  reflection_max_retrieval_attempts: 2,
};

export function createDefaultSettingsRow(locationId: string | null = null): AISettingsRow {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    location_id: locationId,
    general: DEFAULT_GENERAL_SETTINGS,
    knowledge: DEFAULT_KNOWLEDGE_SETTINGS,
    conversation: DEFAULT_CONVERSATION_SETTINGS,
    recommendations: DEFAULT_RECOMMENDATION_SETTINGS,
    advanced: DEFAULT_ADVANCED_SETTINGS,
    knowledge_last_sync_at: null,
    knowledge_status: "unknown",
    updated_by: null,
    created_at: now,
    updated_at: now,
  };
}

export function createDefaultPersonalityRow(locationId: string | null = null): AIPersonalityRow {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    location_id: locationId,
    assistant_name: "Cheffy",
    greeting_message: "Namaste! 👋 I'm Cheffy, your dining concierge. I'd be delighted to help you today.",
    welcome_back_message: "Welcome back! Great to see you again. Ready for another delicious meal?",
    farewell_message: "Have a wonderful meal! 🍛 We look forward to serving you.",
    typing_messages: [
      "🍛 I'm checking that for you…",
      "✨ I'd be delighted to help!",
      "🍽️ Just a moment…",
    ],
    tone: "friendly",
    festival_templates: {},
    birthday_messages: ["Happy birthday! 🎉 We'd love to help you celebrate with something special."],
    anniversary_messages: ["Happy anniversary! ❤️ Congratulations on your special day."],
    closing_messages: [
      "Have a wonderful meal! 🍛",
      "We look forward to serving you.",
      "Hope to see you soon!",
    ],
    emoji_level: "low",
    location_overrides: {},
    updated_by: null,
    created_at: now,
    updated_at: now,
  };
}

export function createDefaultProviderRow(): AIProviderSettingsRow {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    provider: "gemini",
    model: null,
    temperature: 0.7,
    top_p: 0.95,
    top_k: 40,
    max_output_tokens: 1024,
    streaming_enabled: true,
    retry_count: 1,
    timeout_ms: 30000,
    status: "active",
    updated_by: null,
    created_at: now,
    updated_at: now,
  };
}

export const DEFAULT_SYSTEM_PROMPT = CHEFFY_SYSTEM_PROMPT_CORE;

export const PROMPT_VARIABLES = [
  "{{current_location}}",
  "{{current_time}}",
  "{{conversation_history}}",
  "{{guest_preferences}}",
  "{{tool_results}}",
];

export const AI_SECTIONS = [
  { id: "general", label: "General" },
  { id: "personality", label: "Personality" },
  { id: "knowledge", label: "Knowledge" },
  { id: "knowledge-debugger", label: "Knowledge Debugger" },
  { id: "reflection", label: "Reflection" },
  { id: "search-lab", label: "Search Lab" },
  { id: "feedback", label: "AI Feedback" },
  { id: "relationships", label: "Relationships" },
  { id: "validator", label: "Validator" },
  { id: "cost-analytics", label: "Cost Analytics" },
  { id: "quality-analytics", label: "Quality Analytics" },
  { id: "improvements", label: "Improvements" },
  { id: "audit", label: "Audit" },
  { id: "providers", label: "Providers" },
  { id: "prompt", label: "Prompt" },
  { id: "conversation", label: "Conversation" },
  { id: "suggestions", label: "Suggestions" },
  { id: "analytics", label: "Analytics" },
  { id: "testing", label: "Testing" },
  { id: "logs", label: "Logs" },
  { id: "errors", label: "Error Logs" },
  { id: "advanced", label: "Advanced" },
] as const;

export type AISectionId = (typeof AI_SECTIONS)[number]["id"];
