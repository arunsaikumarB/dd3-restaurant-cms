/**
 * Reflection Layer types — evaluate Gemini output only.
 * Never rewrites answers. Never modifies Planner / Tool Orchestrator / RAG / Gemini.
 */

import type { AgentExecutionPlan, ClarificationField } from "../planner/types";
import type { ToolOrchestratorResult } from "../toolOrchestrator/types";

export type ConfidenceBand = "high" | "medium" | "low";

export type ReflectionNextAction =
  | "accept"
  | "ask_follow_up"
  | "suggest_human"
  | "limited_answer"
  | "recommend_call"
  | "retry_retrieval";

export type ConfidenceBreakdown = {
  planner: number;
  rag: number;
  tools: number;
  businessRules: number;
  history: number;
  freshness: number;
  coverage: number;
  clarification: number;
  weights: Record<string, number>;
};

export type EscalationRecommendation = {
  recommended: boolean;
  reason: string;
  priority: "low" | "medium" | "high" | "critical";
  suggestedDepartment: string;
};

export type GoalProgressSnapshot = {
  goal: string;
  progressPercent: number;
  completedFields: ClarificationField[];
  missingFields: ClarificationField[];
  status: "active" | "completed" | "blocked" | "escalated";
};

export type ReflectionResult = {
  reflectionId: string;
  completed: boolean;
  confidence: number;
  confidenceBand: ConfidenceBand;
  breakdown: ConfidenceBreakdown;
  missing: ClarificationField[];
  needsFollowUp: boolean;
  followUpQuestion: string | null;
  needsEscalation: boolean;
  escalation: EscalationRecommendation;
  nextAction: ReflectionNextAction;
  goalProgress: GoalProgressSnapshot;
  reason: string;
  evaluation: {
    intentsCovered: boolean;
    goalComplete: boolean;
    requiredToolsOk: boolean;
    contextCoverage: number;
    toolSuccessRate: number;
    avgSimilarity: number;
    ignoredContextRisk: boolean;
    reflectionScore: number;
  };
  /** Gemini text unchanged — optional additive suffix for UX (clarification / soft escalate) */
  additiveSuffix: string | null;
  createdAt: string;
};

export type ReflectionConfig = {
  highConfidenceMin: number;
  mediumConfidenceMin: number;
  escalateBelow: number;
  maxClarifications: number;
  maxRetrievalAttempts: number;
  maxRetries: number;
};

export const DEFAULT_REFLECTION_CONFIG: ReflectionConfig = {
  highConfidenceMin: 0.85,
  mediumConfidenceMin: 0.55,
  escalateBelow: 0.4,
  maxClarifications: 3,
  maxRetrievalAttempts: 2,
  maxRetries: 1,
};

export type ReflectionInput = {
  message: string;
  geminiResponse: string;
  history?: Array<{ role: string; content: string }>;
  plan?: AgentExecutionPlan | null;
  toolOrchestration?: ToolOrchestratorResult | null;
  conversationId?: string | null;
  locationId?: string | null;
  config?: Partial<ReflectionConfig>;
  clarificationCount?: number;
};
