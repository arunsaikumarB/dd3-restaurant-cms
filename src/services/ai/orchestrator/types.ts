import type { CheffyIntent } from "../emotionEngine";
import type { AIRequest } from "../types";
import type { SemanticRetrievalResult } from "../../../types/semanticKnowledge";

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
  semantic?: SemanticRetrievalResult;
  meta: {
    ragChunkCount: number;
    ragTokenEstimate: number;
    toolCount: number;
    cmsModuleCount: number;
  };
};

export const SEMANTIC_TOOL_NAME = "semanticKnowledge";
