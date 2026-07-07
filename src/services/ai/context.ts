import type { CMSKnowledge } from "../cms/knowledge";
import { queryCMSKnowledge } from "../cms/knowledge";
import { detectIntent } from "./emotionEngine";
import { executeConciergeTools } from "./tools";
import type { AICMSContext, AIRequest, AIToolResult, AISessionContext } from "./types";

export function buildRelevantCMSContext(message: string, knowledge: CMSKnowledge): AICMSContext {
  const intent = detectIntent(message);
  const query = queryCMSKnowledge(intent, knowledge);
  return {
    intent,
    modules: query.modules,
    context: query.payload,
  };
}

export function buildToolResults(
  message: string,
  knowledge: CMSKnowledge,
  conversationId?: string,
): AIToolResult[] {
  return executeConciergeTools(message, knowledge, undefined, conversationId);
}

export function buildSessionContext(
  knowledge: CMSKnowledge,
  preferences?: AISessionContext["preferences"],
): AISessionContext {
  return {
    locationId: knowledge.locationId,
    locationName: knowledge.locationName,
    preferences,
  };
}

/** Enriches an AI request with CMS context, tools, and session — no full CMS bundle sent. */
export function enrichAIRequest(
  request: AIRequest,
  knowledge: CMSKnowledge,
  preferences?: AISessionContext["preferences"],
): AIRequest {
  const toolResults = buildToolResults(request.message, knowledge, request.conversationId);
  const cmsContext = buildRelevantCMSContext(request.message, knowledge);

  if (toolResults.length > 0) {
    cmsContext.context = {
      locationId: knowledge.locationId,
      locationName: knowledge.locationName,
    };
  }

  return {
    ...request,
    cmsContext,
    toolResults,
    session: buildSessionContext(knowledge, preferences),
  };
}
