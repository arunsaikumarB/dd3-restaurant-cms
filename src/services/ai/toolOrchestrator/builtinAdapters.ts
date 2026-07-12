/**
 * Built-in adapters wrap EXISTING tools/CMS/RAG — they do not redesign them.
 * Future tools register via registerOrchestratorTool().
 */
import type { CMSKnowledge } from "../../cms/knowledge";
import { queryCMSKnowledge } from "../../cms/knowledge";
import { detectIntent } from "../emotionEngine";
import { executeConciergeTools } from "../tools";
import { ORCHESTRATOR_BUSINESS_RULES } from "../orchestrator/businessRules";
import { retrieveForIntent } from "../../rag/retriever";
import type { LocationId } from "../../../config/locations";
import { registerOrchestratorTool } from "./toolRegistry";
import type { ToolAdapter, ToolAdapterContext } from "./types";

function knowledgeOf(ctx: ToolAdapterContext): CMSKnowledge {
  return ctx.knowledge as CMSKnowledge;
}

function wrapCmsTools(
  id: string,
  source: string,
  toolNames: Parameters<typeof executeConciergeTools>[2],
  cacheable: boolean,
): ToolAdapter {
  return {
    id,
    source,
    cacheable,
    timeoutMs: 4000,
    maxRetries: 1,
    execute: async (ctx) => {
      const results = executeConciergeTools(
        ctx.message,
        knowledgeOf(ctx),
        toolNames,
        ctx.conversationId ?? undefined,
      );
      return {
        result: { tools: results },
        confidence: results.some((r) => r.available) ? 0.9 : 0.2,
        metadata: { toolNames },
      };
    },
  };
}

let registered = false;

export function ensureBuiltinAdaptersRegistered(): void {
  if (registered) return;
  registered = true;

  registerOrchestratorTool(
    wrapCmsTools("hours", "restaurant_settings", ["getRestaurantInfo", "getCurrentLocation"], true),
  );
  registerOrchestratorTool(
    wrapCmsTools("contact", "restaurant_settings", ["getRestaurantInfo", "getCurrentLocation"], true),
  );
  registerOrchestratorTool(
    wrapCmsTools("location", "location", ["getCurrentLocation", "getRestaurantInfo"], true),
  );
  registerOrchestratorTool(wrapCmsTools("offer", "offers", ["getOffers"], true));
  registerOrchestratorTool(wrapCmsTools("offers", "offers", ["getOffers"], true));
  registerOrchestratorTool(wrapCmsTools("review", "reviews", ["getReviews"], true));
  registerOrchestratorTool(wrapCmsTools("reviews", "reviews", ["getReviews"], true));
  registerOrchestratorTool(wrapCmsTools("gallery", "gallery", ["getGallery"], true));
  // Reservation / menu / catering — navigate + info only (no booking/payments APIs yet). Never long-cache reservation.
  registerOrchestratorTool(
    wrapCmsTools("reservation", "reservation", ["getRestaurantInfo", "navigateToPage"], false),
  );
  registerOrchestratorTool(wrapCmsTools("menu", "menu", ["navigateToPage"], false));
  registerOrchestratorTool(
    wrapCmsTools("catering", "catering", ["getHomepageContent", "getSEO", "navigateToPage"], true),
  );
  registerOrchestratorTool({
    id: "future",
    source: "future_apis",
    cacheable: false,
    timeoutMs: 1000,
    maxRetries: 0,
    execute: async () => ({
      result: { available: false, reason: "Future tool not configured" },
      confidence: 0,
    }),
  });

  registerOrchestratorTool({
    id: "cms",
    source: "cms",
    cacheable: true,
    timeoutMs: 3000,
    maxRetries: 1,
    execute: async (ctx) => {
      const knowledge = knowledgeOf(ctx);
      const intent = detectIntent(ctx.message);
      const query = queryCMSKnowledge(intent, knowledge);
      return {
        result: {
          intent,
          modules: query.modules,
          payload: query.payload,
        },
        confidence: 0.9,
      };
    },
  });

  registerOrchestratorTool({
    id: "restaurant_settings",
    source: "restaurant_settings",
    cacheable: true,
    timeoutMs: 3000,
    maxRetries: 1,
    execute: async (ctx) => {
      const knowledge = knowledgeOf(ctx);
      return {
        result: {
          locationId: knowledge.locationId,
          locationName: knowledge.locationName,
          settings: knowledge.modules?.restaurantSettings?.data ?? null,
        },
        confidence: 0.95,
      };
    },
  });

  registerOrchestratorTool({
    id: "business_rules",
    source: "business_rules",
    cacheable: true,
    timeoutMs: 1000,
    maxRetries: 0,
    execute: async (ctx) => ({
      result: {
        rules: ORCHESTRATOR_BUSINESS_RULES,
        needed: ctx.plan.businessRulesNeeded,
      },
      confidence: 1,
    }),
  });

  registerOrchestratorTool({
    id: "semantic_rag",
    source: "semantic_rag",
    cacheable: true,
    timeoutMs: 8000,
    maxRetries: 1,
    execute: async (ctx) => {
      const knowledge = knowledgeOf(ctx);
      const result = await retrieveForIntent({
        query: ctx.message,
        locationId: knowledge.locationId as LocationId,
        intent: detectIntent(ctx.message),
        signal: ctx.signal,
        matchCount: 6,
      });
      return {
        result,
        confidence: result.available ? 0.85 : 0.2,
        metadata: { cached: result.cached, reason: result.reason },
      };
    },
  });

  registerOrchestratorTool({
    id: "conversation_memory",
    source: "conversation_memory",
    cacheable: false,
    timeoutMs: 500,
    maxRetries: 0,
    execute: async (ctx) => ({
      result: {
        conversationId: ctx.conversationId ?? null,
        note: "Memory is supplied by the request history; adapter acknowledges presence.",
      },
      confidence: 1,
    }),
  });
}
