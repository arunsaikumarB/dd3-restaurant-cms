import { detectIntent } from "../emotionEngine";
import { categoriesForIntent } from "../../rag/categories";
import { shouldUseSemanticRag } from "../../rag/retriever";
import type { SourcePlan } from "./types";

const DEFAULT_MAX_RAG_CHUNKS = 4;
const DEFAULT_MAX_RAG_TOKENS = 1200;

export function planContextSources(message: string): SourcePlan {
  const intent = detectIntent(message);
  const useSemanticRag = shouldUseSemanticRag(intent, message);

  const sources: SourcePlan["sources"] = [
    "outlet",
    "business_rules",
    "session",
    "personality",
    "cms",
    "tools",
  ];

  if (useSemanticRag) sources.push("semantic_rag");

  return {
    intent,
    sources,
    semanticCategories: categoriesForIntent(intent),
    useSemanticRag,
    maxRagChunks: DEFAULT_MAX_RAG_CHUNKS,
    maxRagTokens: DEFAULT_MAX_RAG_TOKENS,
  };
}
