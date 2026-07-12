import type { CheffyIntent } from "../emotionEngine";
import type { AIRequest } from "../types";
import type { SemanticRetrievalResult } from "../../../types/semanticKnowledge";
import type { AgentExecutionPlan } from "../planner/types";

export type ContextSource =
  | "cms"
  | "semantic_rag"
  | "tools"
  | "session"
  | "personality"
  | "outlet"
  | "business_rules";

export type SourcePlan = {
  intent: CheffyIntent;
  sources: ContextSource[];
  semanticCategories?: string[];
  useSemanticRag: boolean;
  maxRagChunks: number;
  maxRagTokens: number;
};

export type OrchestratedContext = {
  request: AIRequest;
  plan: SourcePlan;
  /** Agentic execution plan — produced before retrieval; never answers the guest. */
  executionPlan?: AgentExecutionPlan;
  semantic?: SemanticRetrievalResult;
  meta: {
    ragChunkCount: number;
    ragTokenEstimate: number;
    toolCount: number;
    cmsModuleCount: number;
  };
};

export const SEMANTIC_TOOL_NAME = "semanticKnowledge";
