import type { CMSKnowledge } from "../../cms/knowledge";
import { enrichAIRequest } from "../context";
import type { AIRequest, AISessionContext } from "../types";
import { retrieveForIntent } from "../../rag/retriever";
import { buildSemanticToolPayload, trimSemanticChunks } from "./businessRules";
import { planContextSources } from "./sourcePlanner";
import type { OrchestratedContext } from "./types";
import { SEMANTIC_TOOL_NAME } from "./types";
import { createAndLogExecutionPlan } from "../planner";
import { runToolOrchestrator } from "../toolOrchestrator";
import { attachCrmToContextPackage, attachJourneyToContextPackage } from "../toolOrchestrator/contextAggregator";
import type { ToolOrchestratorResult } from "../toolOrchestrator";
import { resolveCrmContext, syncCrmAfterReservation } from "../../restaurantOperations/crm";
import { syncCrmAfterCatering } from "../../restaurantOperations/events";
import { resolveJourneyContext } from "../../restaurantOperations/journey";

/**
 * Context Orchestrator — extends (does not replace) enrichAIRequest.
 *
 * Flow:
 * Planner → Tool Orchestrator → (optional RAG) → unified context → Gemini-ready request
 *
 * Does not redesign Planner, Semantic RAG internals, Gemini, or existing tool handlers.
 */
export async function orchestrateAIRequest(
  request: AIRequest,
  knowledge: CMSKnowledge,
  preferences?: AISessionContext["preferences"],
): Promise<OrchestratedContext> {
  // 1) Planner — think before acting
  const executionPlan = await createAndLogExecutionPlan({
    message: request.message,
    conversationId: request.conversationId,
    locationId: knowledge.locationId,
    history: request.history,
  });

  // 2) Tool Orchestrator — execute the plan (sources + tools), never stop on single failure
  const toolOrchestrationBase = await runToolOrchestrator({
    plan: executionPlan,
    knowledge,
    message: request.message,
    conversationId: request.conversationId,
    history: request.history,
    personality: preferences ? { preferences } : undefined,
    signal: request.signal,
  });

  // 2b) Context Aggregator enrichment — CRM personalization (Planner never queries CRM)
  let toolOrchestration: ToolOrchestratorResult = toolOrchestrationBase;
  try {
    const crm = await resolveCrmContext({
      locationId: knowledge.locationId,
      message: request.message,
      conversationId: request.conversationId,
    });
    let enrichedPkg = attachCrmToContextPackage(
      toolOrchestrationBase.contextPackage,
      crm as unknown as Record<string, unknown>,
    );
    // Journey Engine — Context Aggregator only (does not modify Planner / CRM / Workflow)
    const journey = await resolveJourneyContext({
      locationId: knowledge.locationId,
      message: request.message,
      customerId: (crm.customerId as string | null) ?? null,
    });
    enrichedPkg = attachJourneyToContextPackage(
      enrichedPkg,
      journey as unknown as Record<string, unknown>,
    );
    toolOrchestration = {
      ...toolOrchestrationBase,
      contextPackage: enrichedPkg,
    };

    // Soft-link reservation outcomes into CRM without modifying Reservation Engine
    const reservationTool = toolOrchestration.toolResults.find((r) => String(r.toolId) === "reservation");
    const engine = (reservationTool?.result as { engine?: { ok?: boolean; reservation?: Record<string, unknown> } } | undefined)
      ?.engine;
    const reservation = engine?.reservation;
    if (engine?.ok && reservation?.id && reservation.phone && reservation.customerName) {
      void syncCrmAfterReservation({
        locationId: knowledge.locationId,
        reservationId: String(reservation.id),
        customerName: String(reservation.customerName),
        phone: String(reservation.phone),
        email: (reservation.email as string | null) ?? null,
        date: (reservation.date as string | null) ?? null,
        time: (reservation.time as string | null) ?? null,
        guests: reservation.guests != null ? Number(reservation.guests) : null,
        occasion: (reservation.occasion as string | null) ?? null,
        highChair: Boolean(reservation.highChair),
        outdoor: (reservation.outdoorRequested as boolean | null) ?? null,
        booth: (reservation.boothRequested as boolean | null) ?? null,
        window: (reservation.windowRequested as boolean | null) ?? null,
        dietary: (reservation.dietaryRestrictions as string[]) ?? [],
        tableId: (reservation.tableId as string | null) ?? null,
        status: String(reservation.status ?? "pending"),
      });
    }

    // Soft-link catering outcomes into CRM without modifying Event Engine / CRM internals
    const cateringTool = toolOrchestration.toolResults.find((r) => String(r.toolId) === "catering");
    const cateringEngine = (
      cateringTool?.result as {
        engine?: {
          ok?: boolean;
          lead?: { phone?: string | null; customerName?: string; email?: string | null };
          event?: { id?: string; eventType?: string; guestCount?: number | null; workflowStage?: string };
        };
      } | undefined
    )?.engine;
    const cateringLead = cateringEngine?.lead;
    const cateringEvent = cateringEngine?.event;
    if (cateringEngine?.ok && cateringLead?.phone && cateringLead.customerName) {
      void syncCrmAfterCatering({
        locationId: knowledge.locationId,
        customerName: cateringLead.customerName,
        phone: cateringLead.phone,
        email: cateringLead.email ?? null,
        eventId: cateringEvent?.id ?? null,
        eventType: cateringEvent?.eventType ?? null,
        guestCount: cateringEvent?.guestCount ?? null,
        stage: cateringEvent?.workflowStage ?? null,
      });
    }
  } catch {
    toolOrchestration = toolOrchestrationBase;
  }

  // 3) Existing source plan (kept for backward-compatible meta)
  const plan = planContextSources(request.message);

  // 4) Base enrichment for CMS/session shape — toolResults replaced by orchestrator
  const base = enrichAIRequest(request, knowledge, preferences);
  const enriched: AIRequest = {
    ...base,
    toolResults: toolOrchestration.aiToolResults.length
      ? toolOrchestration.aiToolResults
      : base.toolResults,
  };

  // Prefer RAG from orchestrator package when present; else fall back to existing path
  let semantic = undefined;
  const ragFromOrch = toolOrchestration.toolResults.find(
    (r) => String(r.toolId) === "semantic_rag" && r.status === "success",
  );
  if (ragFromOrch?.result && typeof ragFromOrch.result === "object") {
    semantic = ragFromOrch.result as Awaited<ReturnType<typeof retrieveForIntent>>;
  } else if (plan.useSemanticRag && executionPlan.knowledgeSources.includes("semantic_rag")) {
    semantic = await retrieveForIntent({
      query: request.message,
      locationId: knowledge.locationId,
      intent: plan.intent,
      signal: request.signal,
      matchCount: plan.maxRagChunks + 2,
    });
    if (semantic?.chunks?.length) {
      try {
        const { boostRelatedChunks } = await import("../../knowledgeIntelligence/relationships");
        const boosted = await boostRelatedChunks(semantic.chunks, 3);
        semantic = { ...semantic, chunks: boosted };
      } catch {
        /* optional */
      }
    }
  }

  const trimmedChunks = semantic?.chunks?.length
    ? trimSemanticChunks(semantic.chunks, plan.maxRagChunks, plan.maxRagTokens)
    : [];

  const hasSemantic = trimmedChunks.length > 0;

  // Attach planner + unified context package (structured — not string concat)
  if (enriched.cmsContext) {
    const cmsFromOrch = toolOrchestration.contextPackage.cms;
    enriched.cmsContext = {
      ...enriched.cmsContext,
      context: {
        locationId: knowledge.locationId,
        locationName: knowledge.locationName,
        ...(Object.keys(cmsFromOrch).length ? { orchestratorCms: cmsFromOrch } : {}),
        agentExecutionPlan: {
          planId: executionPlan.planId,
          intent: executionPlan.intent,
          goal: executionPlan.goal,
          complexity: executionPlan.complexity,
          confidence: executionPlan.confidence,
          knowledgeSources: executionPlan.knowledgeSources,
          requiredTools: executionPlan.requiredTools,
          clarification: executionPlan.clarification,
          humanEscalation: executionPlan.humanEscalation,
          workflow: executionPlan.workflow,
        },
        agentContextPackage: toolOrchestration.contextPackage,
        agentCrmContext: toolOrchestration.contextPackage.crm ?? null,
        agentOrchestratorMeta: {
          packageId: toolOrchestration.packageId,
          mode: toolOrchestration.schedule.mode,
          durationMs: toolOrchestration.durationMs,
          successCount: toolOrchestration.contextPackage.meta.successCount,
          failureCount: toolOrchestration.contextPackage.meta.failureCount,
        },
      },
    };
  }

  if (hasSemantic && semantic) {
    const semanticTool: import("../types").AIToolResult = {
      tool: SEMANTIC_TOOL_NAME,
      available: true,
      data: buildSemanticToolPayload(trimmedChunks, request.message),
    };
    const existingTools = enriched.toolResults ?? [];
    enriched.toolResults = [...existingTools, semanticTool];
  }

  return {
    request: enriched,
    plan,
    executionPlan,
    toolOrchestration,
    semantic: semantic
      ? {
          ...semantic,
          chunks: trimmedChunks,
          tokenEstimate: trimmedChunks.reduce((n, c) => n + Math.ceil(c.content.length / 4), 0),
        }
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

export type { ToolOrchestratorResult };
