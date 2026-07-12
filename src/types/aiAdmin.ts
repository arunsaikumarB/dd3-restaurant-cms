import type { Json, Timestamps } from "./database";

export type AIAccessLevel = "super_admin" | "manager" | "staff";

export type AITone = "friendly" | "professional" | "luxury" | "casual" | "family";
export type AIEmojiLevel = "low" | "medium" | "high";
export type AIProviderId = "gemini" | "openai" | "claude" | "mock";
export type AIKnowledgeStatus = "healthy" | "stale" | "error" | "unknown" | "syncing";
export type AISuggestionCategory =
  | "quick_chip"
  | "homepage"
  | "context"
  | "seasonal"
  | "festival"
  | "location";

export type AIGeneralSettings = {
  ai_enabled?: boolean;
  floating_assistant?: boolean;
  welcome_animation?: boolean;
  voice_greeting?: boolean;
  typing_animation?: boolean;
  recommendation_cards?: boolean;
  follow_up_suggestions?: boolean;
  dynamic_chips?: boolean;
  conversation_memory?: boolean;
  hospitality_personality?: boolean;
  maintenance_mode?: boolean;
  default_location_behavior?: "visitor_selected" | "south-plainfield" | "prompt";
};

export type AIKnowledgeSettings = {
  homepage?: boolean;
  offers?: boolean;
  gallery?: boolean;
  reviews?: boolean;
  seo?: boolean;
  restaurant_settings?: boolean;
  menu?: boolean;
  reservations?: boolean;
  chefgaa?: boolean;
};

export type AIConversationSettings = {
  session_timeout_minutes?: number;
  memory_length?: number;
  max_messages?: number;
  context_window?: number;
  conversation_reset?: "manual" | "session" | "daily";
  welcome_back_duration_minutes?: number;
  typing_delay_ms?: number;
  streaming_speed?: "slow" | "normal" | "fast";
};

export type AIRecommendationSettings = {
  family?: boolean;
  vegetarian?: boolean;
  spicy?: boolean;
  kids?: boolean;
  budget?: boolean;
  celebration?: boolean;
  office_lunch?: boolean;
  menu_recommendations?: boolean;
};

export type AIAdvancedSettings = {
  cache_duration_seconds?: number;
  retry_attempts?: number;
  streaming_buffer_ms?: number;
  provider_failover?: boolean;
  experimental_features?: boolean;
  /** Reflection / confidence thresholds (additive) */
  reflection_high_confidence_min?: number;
  reflection_medium_confidence_min?: number;
  reflection_escalate_below?: number;
  reflection_max_clarifications?: number;
  reflection_max_retrieval_attempts?: number;
};

export interface AISettingsRow extends Timestamps {
  id: string;
  location_id: string | null;
  general: AIGeneralSettings;
  knowledge: AIKnowledgeSettings;
  conversation: AIConversationSettings;
  recommendations: AIRecommendationSettings;
  advanced: AIAdvancedSettings;
  knowledge_last_sync_at: string | null;
  knowledge_status: AIKnowledgeStatus;
  updated_by: string | null;
}

export interface AIPersonalityRow extends Timestamps {
  id: string;
  location_id: string | null;
  assistant_name: string;
  greeting_message: string | null;
  welcome_back_message: string | null;
  farewell_message: string | null;
  typing_messages: Json;
  tone: AITone;
  festival_templates: Json;
  birthday_messages: Json;
  anniversary_messages: Json;
  closing_messages: Json;
  emoji_level: AIEmojiLevel;
  location_overrides: Json;
  updated_by: string | null;
}

export interface AIProviderSettingsRow extends Timestamps {
  id: string;
  provider: AIProviderId;
  model: string | null;
  temperature: number;
  top_p: number;
  top_k: number;
  max_output_tokens: number;
  streaming_enabled: boolean;
  retry_count: number;
  timeout_ms: number;
  status: "active" | "degraded" | "disabled";
  updated_by: string | null;
}

export interface AIPromptVersionRow {
  id: string;
  version: string;
  content: string;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface AISuggestedQuestionRow extends Timestamps {
  id: string;
  location_id: string | null;
  category: AISuggestionCategory;
  label: string;
  prompt: string;
  emoji: string | null;
  sort_order: number;
  enabled: boolean;
}

export interface AIFollowupRow extends Timestamps {
  id: string;
  location_id: string | null;
  topic: string;
  label: string;
  prompt: string;
  sort_order: number;
  enabled: boolean;
}

export interface AIFeatureFlagRow {
  key: string;
  enabled: boolean;
  config: Json;
  updated_at: string;
}

export interface AIConversationLogRow {
  id: string;
  conversation_id: string;
  location_id: string | null;
  provider: string | null;
  model: string | null;
  message_count: number;
  tool_call_count: number;
  duration_ms: number | null;
  error_count: number;
  is_sandbox: boolean;
  metadata: Json;
  started_at: string;
  ended_at: string | null;
}

export interface AIToolLogRow {
  id: string;
  conversation_log_id: string | null;
  conversation_id: string | null;
  tool_name: string;
  location_id: string | null;
  success: boolean;
  duration_ms: number | null;
  cached: boolean;
  error_message: string | null;
  created_at: string;
}

export interface AIErrorLogRow {
  id: string;
  error_type: string;
  provider: string | null;
  location_id: string | null;
  message: string;
  retried: boolean;
  metadata: Json;
  created_at: string;
}

export type AIAnalyticsSummary = {
  totalConversations: number;
  todayConversations: number;
  weeklyConversations: number;
  monthlyConversations: number;
  avgMessageCount: number;
  avgDurationMs: number;
  topQuestions: Array<{ label: string; count: number }>;
  topTools: Array<{ tool: string; count: number }>;
  topLocations: Array<{ locationId: string; count: number }>;
};

export type AISandboxResult = {
  content: string;
  provider: string;
  model: string;
  latencyMs: number;
  toolResults: unknown[];
  cmsContext: unknown;
  session: unknown;
};
