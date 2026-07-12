/**
 * Reservation Tool — single interface for Planner / Tool Orchestrator.
 * Registers via registerOrchestratorTool (overwrites CMS navigate-only adapter).
 * Does not modify Planner or Orchestrator core logic.
 */

import { executeConciergeTools } from "../../ai/tools";
import { registerOrchestratorTool } from "../../ai/toolOrchestrator/toolRegistry";
import type { ToolAdapter } from "../../ai/toolOrchestrator/types";
import type { CMSKnowledge } from "../../cms/knowledge";
import { runReservationEngine, detectActionFromMessage } from "./reservationEngine";

function knowledgeOf(ctx: { knowledge: unknown }): CMSKnowledge {
  return ctx.knowledge as CMSKnowledge;
}

export function createReservationToolAdapter(): ToolAdapter {
  return {
    id: "reservation",
    source: "reservation_engine",
    cacheable: false,
    timeoutMs: 10000,
    maxRetries: 1,
    execute: async (ctx) => {
      const knowledge = knowledgeOf(ctx);
      const action = detectActionFromMessage(ctx.message);
      const engine = await runReservationEngine({
        action,
        locationId: knowledge.locationId,
        message: ctx.message,
        conversationId: ctx.conversationId,
      });

      // Still provide navigation/info context for Gemini (additive, not a second booking path)
      const cmsTools = executeConciergeTools(
        ctx.message,
        knowledge,
        ["getRestaurantInfo", "navigateToPage"],
        ctx.conversationId ?? undefined,
      );

      return {
        result: {
          available: engine.ok || engine.missingFields.length > 0 || Boolean(engine.data?.suggestWaitlist),
          engine,
          action: engine.action,
          missingFields: engine.missingFields,
          followUpQuestion: engine.followUpQuestion,
          message: engine.message,
          reservation: engine.reservation,
          slots: engine.slots,
          waitlist: engine.waitlist,
          tools: cmsTools,
        },
        confidence: engine.ok ? 0.95 : engine.missingFields.length ? 0.7 : 0.4,
        metadata: {
          source: "reservation_engine",
          action: engine.action,
          confirmationCode: engine.reservation?.confirmationCode ?? null,
        },
      };
    },
  };
}

let registered = false;

/** Safe to call multiple times — replaces the built-in reservation adapter. */
export function registerReservationEngineTool(): void {
  if (registered) {
    registerOrchestratorTool(createReservationToolAdapter());
    return;
  }
  registered = true;
  registerOrchestratorTool(createReservationToolAdapter());
}
