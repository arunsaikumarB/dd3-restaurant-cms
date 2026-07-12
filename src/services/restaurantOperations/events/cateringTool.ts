/**
 * Catering Tool — single interface for Planner / Tool Orchestrator.
 * Registers via registerOrchestratorTool (overwrites CMS catering adapter).
 * Does not modify Planner or Orchestrator core logic.
 */

import { executeConciergeTools } from "../../ai/tools";
import { registerOrchestratorTool } from "../../ai/toolOrchestrator/toolRegistry";
import type { ToolAdapter } from "../../ai/toolOrchestrator/types";
import type { CMSKnowledge } from "../../cms/knowledge";
import { detectCateringAction, runEventEngine } from "./eventEngine";

function knowledgeOf(ctx: { knowledge: unknown }): CMSKnowledge {
  return ctx.knowledge as CMSKnowledge;
}

export function createCateringToolAdapter(): ToolAdapter {
  return {
    id: "catering",
    source: "event_engine",
    cacheable: false,
    timeoutMs: 12000,
    maxRetries: 1,
    execute: async (ctx) => {
      const knowledge = knowledgeOf(ctx);
      const action = detectCateringAction(ctx.message);
      const engine = await runEventEngine({
        action,
        locationId: knowledge.locationId,
        message: ctx.message,
        conversationId: ctx.conversationId,
      });

      const cmsTools = executeConciergeTools(
        ctx.message,
        knowledge,
        ["getHomepageContent", "getSEO", "navigateToPage"],
        ctx.conversationId ?? undefined,
      );

      return {
        result: {
          available: engine.ok || engine.missingFields.length > 0,
          engine,
          action: engine.action,
          missingFields: engine.missingFields,
          followUpQuestion: engine.followUpQuestion,
          message: engine.message,
          lead: engine.lead,
          event: engine.event,
          quote: engine.quote,
          packages: engine.packages,
          recommendations: engine.recommendations,
          tools: cmsTools,
        },
        confidence: engine.ok ? 0.95 : engine.missingFields.length ? 0.72 : 0.45,
        metadata: {
          source: "event_engine",
          action: engine.action,
          leadId: engine.lead?.id ?? null,
          eventId: engine.event?.id ?? null,
          quoteTotal: engine.quote?.grandTotal ?? null,
        },
      };
    },
  };
}

let registered = false;

/** Safe to call multiple times — replaces the built-in catering adapter. */
export function registerCateringEngineTool(): void {
  if (registered) {
    registerOrchestratorTool(createCateringToolAdapter());
    return;
  }
  registered = true;
  registerOrchestratorTool(createCateringToolAdapter());
}
