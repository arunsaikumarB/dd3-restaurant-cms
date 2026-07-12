import type { AgentExecutionPlan } from "../planner/types";
import type { ExecutionMode, OrchestratorToolResult, UnifiedContextPackage } from "./types";

export function aggregateContext(input: {
  plan: AgentExecutionPlan;
  toolResults: OrchestratorToolResult[];
  memory: Record<string, unknown>;
  personality?: Record<string, unknown>;
  mode: ExecutionMode;
  durationMs: number;
}): UnifiedContextPackage {
  const byId = Object.fromEntries(input.toolResults.map((r) => [String(r.toolId), r]));

  const cms = pickResult(byId, ["cms", "restaurant_settings"]);
  const rag = pickResult(byId, ["semantic_rag"]);
  const offers = pickResult(byId, ["offers", "offer"]);
  const reviews = pickResult(byId, ["reviews", "review"]);
  const gallery = pickResult(byId, ["gallery"]);
  const restaurant = pickResult(byId, ["hours", "contact", "location", "restaurant_settings"]);
  const rules = pickResult(byId, ["business_rules"]);

  const toolsBag: Record<string, unknown> = {};
  for (const r of input.toolResults) {
    toolsBag[String(r.toolId)] = {
      status: r.status,
      executionTimeMs: r.executionTimeMs,
      confidence: r.confidence,
      source: r.source,
      cached: r.cached,
      errors: r.errors,
      data: r.result,
      metadata: r.metadata,
    };
  }

  const successCount = input.toolResults.filter((r) => r.status === "success").length;
  const failureCount = input.toolResults.filter((r) =>
    ["failed", "timeout", "circuit_open", "unknown_tool"].includes(r.status),
  ).length;
  const cacheHits = input.toolResults.filter((r) => r.cached).length;
  const cacheMisses = input.toolResults.filter((r) => !r.cached && r.status === "success").length;

  return {
    planner: {
      planId: input.plan.planId,
      intent: input.plan.intent,
      goal: input.plan.goal,
      complexity: input.plan.complexity,
      confidence: input.plan.confidence,
      knowledgeSources: input.plan.knowledgeSources,
      requiredTools: input.plan.requiredTools,
      clarification: input.plan.clarification,
      humanEscalation: input.plan.humanEscalation,
      workflow: input.plan.workflow,
    },
    cms: asObject(cms),
    rag: asObject(rag),
    memory: input.memory,
    tools: toolsBag,
    rules: asObject(rules),
    personality: input.personality ?? {},
    restaurant: asObject(restaurant),
    location: {
      ...(typeof restaurant === "object" && restaurant ? restaurant : {}),
      ...(offers ? { offers } : {}),
      ...(reviews ? { reviews } : {}),
      ...(gallery ? { gallery } : {}),
    },
    crm: {},
    journey: {},
    meta: {
      packageId: crypto.randomUUID(),
      planId: input.plan.planId,
      totalDurationMs: input.durationMs,
      toolCount: input.toolResults.length,
      successCount,
      failureCount,
      cacheHits,
      cacheMisses,
      mode: input.mode,
    },
  };
}

/**
 * Attach CRM personalization into the unified package.
 * Does not modify Planner / Tool Orchestrator execution / Reservation Engine.
 */
export function attachCrmToContextPackage(
  pkg: UnifiedContextPackage,
  crm: Record<string, unknown> | null | undefined,
): UnifiedContextPackage {
  if (!crm || !Object.keys(crm).length) return pkg;
  const knownFields = Array.isArray(crm.knownFields) ? (crm.knownFields as string[]) : [];
  return {
    ...pkg,
    crm,
    memory: {
      ...pkg.memory,
      crmCustomerId: crm.customerId ?? null,
      crmSummary: crm.summary ?? null,
      crmKnownFields: knownFields,
    },
    personality: {
      ...pkg.personality,
      crm: {
        returning: crm.returning,
        displayName: crm.displayName,
        isVip: crm.isVip,
        preferences: crm.preferences,
        loyalty: crm.loyalty,
        segments: crm.segments,
        birthdaySoon: crm.birthdaySoon,
        anniversarySoon: crm.anniversarySoon,
      },
    },
  };
}

/**
 * Attach Customer Journey intelligence into the unified package.
 * Planner never queries Journey DB — Context Aggregator enrichment only.
 */
export function attachJourneyToContextPackage(
  pkg: UnifiedContextPackage,
  journey: Record<string, unknown> | null | undefined,
): UnifiedContextPackage {
  if (!journey || !Object.keys(journey).length || !journey.customerId) return pkg;
  return {
    ...pkg,
    journey,
    memory: {
      ...pkg.memory,
      journeyStage: journey.stage ?? null,
      journeySummary: journey.summary ?? null,
      nextBestAction: journey.nextBestAction ?? null,
    },
    personality: {
      ...pkg.personality,
      journey: {
        stage: journey.stage,
        stageName: journey.stageName,
        relationshipScore: journey.relationshipScore,
        churnRisk: journey.churnRisk,
        nextBestAction: journey.nextBestAction,
        recommendedOffers: journey.recommendedOffers,
        milestones: journey.milestones,
        upcomingMilestones: journey.upcomingMilestones,
      },
    },
  };
}

function pickResult(
  byId: Record<string, OrchestratorToolResult>,
  ids: string[],
): unknown {
  for (const id of ids) {
    const hit = byId[id];
    if (hit?.status === "success" && hit.result != null) return hit.result;
  }
  return {};
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return { value };
}

/** Map orchestrator results into Gemini-compatible toolResults array. */
export function toAIToolResults(
  toolResults: OrchestratorToolResult[],
): Array<{ tool: string; available: boolean; data: unknown }> {
  return toolResults
    .filter((r) => !["cms", "semantic_rag", "business_rules", "conversation_memory"].includes(String(r.toolId)))
    .map((r) => ({
      tool: mapToLegacyToolName(String(r.toolId)),
      available: r.status === "success" && r.result != null,
      data: r.result,
    }));
}

function mapToLegacyToolName(id: string): string {
  switch (id) {
    case "offer":
    case "offers":
      return "getOffers";
    case "review":
    case "reviews":
      return "getReviews";
    case "gallery":
      return "getGallery";
    case "hours":
    case "contact":
    case "restaurant_settings":
      return "getRestaurantInfo";
    case "location":
      return "getCurrentLocation";
    case "reservation":
    case "menu":
    case "catering":
      return "navigateToPage";
    default:
      return id;
  }
}
