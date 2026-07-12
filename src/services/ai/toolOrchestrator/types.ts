/**
 * Tool Orchestrator types — executes Planner plans only.
 * Never redesigns Planner / Semantic RAG / Gemini / existing tool handlers.
 */

import type { AgentExecutionPlan, KnowledgeSourceId, PlannedToolId } from "../planner/types";

export type ExecutionMode = "sequential" | "parallel" | "mixed";

export type OrchestratorToolStatus = "success" | "failed" | "timeout" | "skipped" | "circuit_open" | "unknown_tool";

export type RegisteredToolId = PlannedToolId | KnowledgeSourceId | (string & {});

export type OrchestratorToolResult = {
  toolId: RegisteredToolId;
  status: OrchestratorToolStatus;
  executionTimeMs: number;
  result: unknown;
  errors: string[];
  metadata: Record<string, unknown>;
  confidence: number;
  source: string;
  cached: boolean;
  retries: number;
};

export type ExecutionGroup = {
  id: string;
  mode: "sequential" | "parallel";
  toolIds: RegisteredToolId[];
  dependsOn: string[];
};

export type ExecutionSchedule = {
  mode: ExecutionMode;
  groups: ExecutionGroup[];
  orderedToolIds: RegisteredToolId[];
};

export type UnifiedContextPackage = {
  planner: Record<string, unknown>;
  cms: Record<string, unknown>;
  rag: Record<string, unknown>;
  memory: Record<string, unknown>;
  tools: Record<string, unknown>;
  rules: Record<string, unknown>;
  personality: Record<string, unknown>;
  restaurant: Record<string, unknown>;
  location: Record<string, unknown>;
  /** Restaurant CRM personalization — attached by Context Aggregator enrichment */
  crm?: Record<string, unknown>;
  /** Customer Journey lifecycle intelligence — Context Aggregator only */
  journey?: Record<string, unknown>;
  meta: {
    packageId: string;
    planId: string;
    totalDurationMs: number;
    toolCount: number;
    successCount: number;
    failureCount: number;
    cacheHits: number;
    cacheMisses: number;
    mode: ExecutionMode;
  };
};

export type ToolOrchestratorTimelineEvent = {
  type:
    | "orchestrator_start"
    | "schedule"
    | "group_start"
    | "tool_start"
    | "tool_finish"
    | "tool_retry"
    | "tool_timeout"
    | "tool_failure"
    | "cache_hit"
    | "cache_miss"
    | "merge"
    | "orchestrator_finish";
  at: string;
  toolId?: string;
  groupId?: string;
  durationMs?: number;
  detail?: string;
  data?: unknown;
};

export type ToolOrchestratorResult = {
  packageId: string;
  planId: string;
  schedule: ExecutionSchedule;
  toolResults: OrchestratorToolResult[];
  contextPackage: UnifiedContextPackage;
  /** Mapped to AIRequest.toolResults for Gemini compatibility */
  aiToolResults: Array<{ tool: string; available: boolean; data: unknown }>;
  timeline: ToolOrchestratorTimelineEvent[];
  durationMs: number;
  executionPlan: AgentExecutionPlan;
};

export type ToolAdapterContext = {
  message: string;
  conversationId?: string | null;
  locationId: string;
  locationName: string;
  knowledge: unknown;
  plan: AgentExecutionPlan;
  signal?: AbortSignal;
};

export type ToolAdapter = {
  id: RegisteredToolId;
  source: string;
  /** Never cache reservation/CRM/payments-like tools */
  cacheable: boolean;
  timeoutMs: number;
  maxRetries: number;
  dependsOn?: RegisteredToolId[];
  execute: (ctx: ToolAdapterContext) => Promise<{
    result: unknown;
    confidence?: number;
    metadata?: Record<string, unknown>;
  }>;
};
