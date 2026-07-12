import type { CMSKnowledge } from "../../cms/knowledge";
import { enrichAIRequest } from "../context";
import type { AIRequest, AISessionContext } from "../types";
import { retrieveForIntent } from "../../rag/retriever";
import { buildSemanticToolPayload, trimSemanticChunks } from "./businessRules";
import { planContextSources } from "./sourcePlanner";
import type { OrchestratedContext } from "./types";
import { SEMANTIC_TOOL_NAME } from "./types";

/**
 * Context Orchestrator — extends (does not replace) enrichAIRequest.
 * Combines CMS, semantic RAG, tools, session, personality, outlet, and business rules.
 */
export async function orchestrateAIRequest(
  request: AIRequest,
  knowledge: CMSKnowledge,
  preferences?: AISessionContext["preferences"],
): Promise<OrchestratedContext> {
  const plan = planContextSources(request.message);
  const base = enrichAIRequest(request, knowledge, preferences);

  let semantic = undefined;
  if (plan.useSemanticRag) {
    semantic = await retrieveForIntent({
      query: request.message,
      locationId: knowledge.locationId,
      intent: plan.intent,
      signal: request.signal,
      matchCount: plan.maxRagChunks + 2,
    });
    // Additive relationship boost — does not change Semantic RAG internals.
    if (semantic?.chunks?.length) {
      try {
        const { boostRelatedChunks } = await import("../../knowledgeIntelligence/relationships");
        const boosted = await boostRelatedChunks(semantic.chunks, 3);
        semantic = { ...semantic, chunks: boosted };
      } catch {
        /* relationships table may be absent until migration 039 */
      }
    }
  }

  const trimmedChunks = semantic?.chunks?.length
    ? trimSemanticChunks(semantic.chunks, plan.maxRagChunks, plan.maxRagTokens)
  : [];

  const hasSemantic = trimmedChunks.length > 0;
  const enriched = { ...base };

  if (hasSemantic && semantic) {
    const semanticTool: import("../types").AIToolResult = {
      tool: SEMANTIC_TOOL_NAME,
      available: true,
      data: buildSemanticToolPayload(trimmedChunks, request.message),
    };

    const existingTools = enriched.toolResults ?? [];
    if (existingTools.length > 0) {
      enriched.toolResults = [...existingTools, semanticTool];
    } else {
      enriched.cmsContext = {
        ...enriched.cmsContext!,
        context: {
          ...enriched.cmsContext?.context,
          semanticKnowledge: buildSemanticToolPayload(trimmedChunks, request.message),
          orchestratorRules: [
            "Use semantic knowledge excerpts below when relevant to the guest question.",
            "Combine with CMS data — never contradict live CMS/tool facts.",
            "If excerpts lack the answer, say so politely.",
          ],
        },
      };
    }
  }

  return {
    request: enriched,
    plan,
    semantic: semantic
      ? { ...semantic, chunks: trimmedChunks, tokenEstimate: trimmedChunks.reduce((n, c) => n + Math.ceil(c.content.length / 4), 0) }
      : undefined,
    meta: {
      ragChunkCount: trimmedChunks.length,
      ragTokenEstimate: trimmedChunks.reduce((n, c) => n + Math.ceil(c.content.length / 4), 0),
      toolCount: enriched.toolResults?.length ?? 0,
      cmsModuleCount: enriched.cmsContext?.modules?.length ?? 0,
    },
  };
}

/** Convenience — returns enriched AIRequest only (drop-in for enrichAIRequest). */
export async function enrichAIRequestWithOrchestrator(
  request: AIRequest,
  knowledge: CMSKnowledge,
  preferences?: AISessionContext["preferences"],
): Promise<AIRequest> {
  const result = await orchestrateAIRequest(request, knowledge, preferences);
  return result.request;
}
