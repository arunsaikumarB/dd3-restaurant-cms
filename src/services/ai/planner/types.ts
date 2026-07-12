/**
 * Agentic Planner types — execution plans only.
 * The planner never calls Gemini, never executes tools, never retrieves knowledge.
 */

export type PlannerIntent =
  | "greeting"
  | "menu_inquiry"
  | "dish_recommendation"
  | "vegetarian"
  | "vegan"
  | "kids_menu"
  | "offers"
  | "reservation"
  | "modify_reservation"
  | "cancel_reservation"
  | "party_booking"
  | "catering"
  | "contact"
  | "directions"
  | "hours"
  | "gallery"
  | "reviews"
  | "restaurant_information"
  | "complaint"
  | "feedback"
  | "order_status"
  | "unknown"
  | (string & {});

export type CustomerGoal =
  | "greet"
  | "book_table"
  | "modify_reservation"
  | "cancel_reservation"
  | "retrieve_reservation"
  | "recommend_dish"
  | "browse_menu"
  | "find_offers"
  | "large_catering"
  | "party_inquiry"
  | "get_hours"
  | "get_directions"
  | "contact_restaurant"
  | "view_gallery"
  | "read_reviews"
  | "file_complaint"
  | "leave_feedback"
  | "check_order"
  | "general_info"
  | "unclear"
  | (string & {});

export type TaskType =
  | "informational"
  | "transactional"
  | "recommendation"
  | "navigational"
  | "support"
  | "multi_step"
  | "unknown";

export type PlanComplexity = "simple" | "medium" | "complex";

export type ConfidenceBand = "high" | "medium" | "low";

export type KnowledgeSourceId =
  | "cms"
  | "semantic_rag"
  | "conversation_memory"
  | "business_rules"
  | "restaurant_settings"
  | "offers"
  | "reviews"
  | "gallery"
  | "future_apis"
  | (string & {});

export type PlannedToolId =
  | "reservation"
  | "menu"
  | "offer"
  | "review"
  | "location"
  | "catering"
  | "gallery"
  | "hours"
  | "contact"
  | "future"
  | (string & {});

export type BusinessRuleId =
  | "large_party"
  | "restaurant_closed"
  | "holiday"
  | "reservation_limits"
  | "kids_policy"
  | "cancellation_policy"
  | "payment_rules"
  | "catering_minimums"
  | (string & {});

export type ClarificationField =
  | "location"
  | "date"
  | "time"
  | "guests"
  | "customer_name"
  | "phone"
  | "party_size"
  | "event_date"
  | "budget"
  | "dietary"
  | "order_id"
  | (string & {});

export type WorkflowStep =
  | "acknowledge"
  | "collect_information"
  | "retrieve_knowledge"
  | "recommend"
  | "reservation"
  | "catering_quote"
  | "confirmation"
  | "escalate_human"
  | "navigate"
  | "answer"
  | (string & {});

export type ClarificationPlan = {
  required: boolean;
  fields: ClarificationField[];
  reason?: string;
};

export type HumanEscalationPlan = {
  recommended: boolean;
  reasons: string[];
};

export type PlannerReasoning = {
  detectedIntent: PlannerIntent;
  secondaryIntents: PlannerIntent[];
  confidence: number;
  confidenceBand: ConfidenceBand;
  complexity: PlanComplexity;
  whyToolsSelected: string[];
  whyKnowledgeSelected: string[];
  clarificationReasons: string[];
  escalationReasons: string[];
  notes: string[];
};

export type AgentExecutionPlan = {
  planId: string;
  intent: PlannerIntent;
  secondaryIntents: PlannerIntent[];
  goal: CustomerGoal;
  conversationGoal: CustomerGoal;
  taskType: TaskType;
  complexity: PlanComplexity;
  confidence: number;
  confidenceBand: ConfidenceBand;
  knowledgeSources: KnowledgeSourceId[];
  requiredTools: PlannedToolId[];
  businessRulesNeeded: BusinessRuleId[];
  clarification: ClarificationPlan;
  humanEscalation: boolean;
  humanEscalationPlan: HumanEscalationPlan;
  workflow: WorkflowStep[];
  reasoning: PlannerReasoning;
  createdAt: string;
};

export type AgentGoalProgress = {
  goalId: string;
  conversationId: string | null;
  goal: CustomerGoal;
  progressPercent: number;
  requiredFields: ClarificationField[];
  collectedFields: ClarificationField[];
  status: "active" | "completed" | "abandoned" | "escalated";
  planId: string | null;
};

export type PlannerInput = {
  message: string;
  conversationId?: string | null;
  locationId?: string | null;
  history?: Array<{ role: string; content: string }>;
  /** Previously collected slot values if known */
  knownFields?: Partial<Record<ClarificationField, string | number | boolean>>;
};
