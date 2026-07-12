/**
 * Enterprise AI Operations Center — types.
 * Additive observability only. Does not modify Planner / Orchestrator / Reflection / RAG / Gemini.
 */

export type WorkflowStatus = "completed" | "partial" | "failed" | "aborted";

export type TimelineEventType =
  | "customer_message"
  | "planner_started"
  | "planner_finished"
  | "execution_plan"
  | "tool_orchestrator_started"
  | "tool_started"
  | "tool_finished"
  | "retrieval"
  | "context_aggregation"
  | "gemini_started"
  | "gemini_finished"
  | "reflection_started"
  | "reflection_finished"
  | "clarification"
  | "escalation"
  | "final_response";

export type WorkflowTimelineEvent = {
  type: TimelineEventType;
  label: string;
  status: "ok" | "warn" | "error" | "skip";
  durationMs: number;
  at: string;
  payload?: Record<string, unknown>;
};

export type WorkflowRecord = {
  workflowId: string;
  conversationId: string | null;
  locationId: string | null;
  planId: string | null;
  packageId: string | null;
  reflectionId: string | null;
  messagePreview: string;
  intent: string;
  goal: string;
  complexity: string;
  status: WorkflowStatus;
  success: boolean;
  timings: {
    totalMs: number;
    plannerMs: number;
    toolMs: number;
    retrievalMs: number;
    aggregationMs: number;
    geminiMs: number;
    reflectionMs: number;
  };
  confidence: number | null;
  confidenceBand: string | null;
  nextAction: string | null;
  needsFollowUp: boolean;
  needsEscalation: boolean;
  toolSuccessCount: number;
  toolFailureCount: number;
  timeline: WorkflowTimelineEvent[];
  stages: string[];
  geminiPreview: string;
  finalPreview: string;
  createdAt: string;
  raw?: Record<string, unknown>;
};

export type PlannerAnalytics = {
  totalPlans: number;
  avgConfidence: number;
  avgLatencyMs: number;
  clarificationRate: number;
  escalationRate: number;
  intentDistribution: Array<{ label: string; value: number }>;
  goalDistribution: Array<{ label: string; value: number }>;
  complexityDistribution: Array<{ label: string; value: number }>;
  mostCommonIntents: Array<{ label: string; value: number }>;
  unknownIntents: number;
  mostComplexRequests: string[];
  plannerTrends: Array<{ label: string; value: number }>;
};

export type ToolAnalytics = {
  totalExecutions: number;
  overallSuccessRate: number;
  overallFailureRate: number;
  avgDurationMs: number;
  cacheHitRate: number;
  parallelFrequency: number;
  sequentialFrequency: number;
  mostUsed: string | null;
  leastUsed: string | null;
  perTool: Array<{
    toolId: string;
    executions: number;
    successRate: number;
    failureRate: number;
    avgDurationMs: number;
    timeouts: number;
    retries: number;
    cacheHits: number;
    cacheMisses: number;
  }>;
};

export type ReflectionOpsAnalytics = {
  averageConfidence: number;
  averageReflectionScore: number;
  clarificationRate: number;
  escalationRate: number;
  fallbackRate: number;
  goalCompletionRate: number;
  confidenceTrend: Array<{ label: string; value: number }>;
  lowConfidenceTopics: string[];
  confidenceDistribution: { high: number; medium: number; low: number };
};

export type PerformanceAnalytics = {
  avgPlannerMs: number;
  avgToolMs: number;
  avgRetrievalMs: number;
  avgAggregationMs: number;
  avgGeminiMs: number;
  avgReflectionMs: number;
  avgTotalMs: number;
  bottlenecks: Array<{ stage: string; avgMs: number; sharePercent: number }>;
  detections: string[];
};

export type HealthComponent = {
  component: string;
  healthScore: number;
  availability: number;
  failureRate: number;
  avgLatencyMs: number;
  warnings: number;
  status: "healthy" | "degraded" | "critical";
};

export type HealthDashboard = {
  overallScore: number;
  overallStatus: "healthy" | "degraded" | "critical";
  components: HealthComponent[];
};

export type GoalAnalytics = {
  completed: number;
  incomplete: number;
  abandoned: number;
  averageCompletion: number;
  mostCommonGoals: Array<{ label: string; value: number }>;
  averageCompletionPercent: number;
};

export type EscalationAnalytics = {
  total: number;
  byReason: Array<{ label: string; value: number }>;
  byDepartment: Array<{ label: string; value: number }>;
  byPriority: Array<{ label: string; value: number }>;
  pending: number;
  repeated: number;
};

export type QualityAnalytics = {
  avgConfidence: number;
  avgKnowledgeCoverage: number;
  avgHallucinationRisk: number;
  successfulConversations: number;
  incompleteConversations: number;
  repeatedClarifications: number;
  answerQualityScore: number;
};

export type OpsRecommendation = {
  id: string;
  type: string;
  title: string;
  reason: string;
  priority: "low" | "medium" | "high";
  status: string;
  evidence?: Record<string, unknown>;
};

export type OpsOverview = {
  totalWorkflows: number;
  successRate: number;
  avgConfidence: number;
  avgTotalMs: number;
  escalationRate: number;
  clarificationRate: number;
  activeConversations: number;
  healthScore: number;
  recentWorkflows: WorkflowRecord[];
};

export type RealtimeSnapshot = {
  currentConversations: number;
  recentPlannerJobs: number;
  recentToolExecutions: number;
  recentRagQueries: number;
  recentEscalations: number;
  recentFailures: number;
  avgResponseMs: number;
  healthScore: number;
  updatedAt: string;
};

export type WorkflowSearchFilters = {
  query?: string;
  intent?: string;
  goal?: string;
  tool?: string;
  escalation?: boolean;
  confidenceBand?: string;
  locationId?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export type ReplayStep = {
  id: string;
  label: string;
  status: "ok" | "warn" | "error" | "skip";
  summary: string;
  data: unknown;
  durationMs: number;
};
