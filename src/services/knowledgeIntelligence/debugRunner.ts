import type { LocationId } from "../../config/locations";
import type {
  KnowledgeDebugChunk,
  KnowledgeDebugReport,
  KnowledgeDebugStage,
  SearchLabOptions,
} from "../../types/knowledgeIntelligence";
import { detectIntent } from "../ai/emotionEngine";
import { planContextSources } from "../ai/orchestrator/sourcePlanner";
import { enrichAIRequestWithOrchestrator, orchestrateAIRequest } from "../ai/orchestrator/contextOrchestrator";
import { createExecutionPlan, summarizePlan } from "../ai/planner";
import { buildCMSKnowledge } from "../cms/knowledge";
import { CONCIERGE_API_PATH } from "../ai/providers/providerTypes";
import { fetchActivePrompt } from "../aiAdmin/repository";
import { boostRelatedChunks } from "./relationships";
import { recordCostEvent } from "./cost";
import { kiClient, kiTable, writeAudit } from "./client";

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function highlightMatch(content: string, question: string): string {
  const words = question
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3)
    .slice(0, 8);
  let out = content;
  for (const w of words) {
    out = out.replace(new RegExp(`(${w})`, "gi"), "「$1」");
  }
  return out.slice(0, 500);
}

async function titlesFor(documentIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!documentIds.length) return map;
  const { data } = await kiTable("semantic_documents").select("id, title").in("id", documentIds);
  for (const row of (data ?? []) as Array<{ id: string; title: string }>) {
    map.set(row.id, row.title);
  }
  return map;
}

export async function runKnowledgeDebug(input: {
  question: string;
  locationId: LocationId;
  locationName?: string;
  options?: Partial<SearchLabOptions>;
}): Promise<KnowledgeDebugReport> {
  const started = performance.now();
  const question = input.question.trim();
  const options: SearchLabOptions = {
    similarityThreshold: input.options?.similarityThreshold ?? 0.55,
    maxChunks: input.options?.maxChunks ?? 10,
    categories: input.options?.categories ?? [],
    locationId: input.locationId,
    language: input.options?.language,
    includeRelationships: input.options?.includeRelationships ?? true,
    includeCms: input.options?.includeCms ?? true,
    includeTools: input.options?.includeTools ?? true,
    runLlm: input.options?.runLlm ?? true,
  };

  const stages: KnowledgeDebugStage[] = [];
  const push = (stage: KnowledgeDebugStage) => stages.push(stage);

  // 1. Customer question
  push({
    id: "question",
    label: "Customer Question",
    status: "ok",
    durationMs: 0,
    summary: question,
    data: { question },
  });

  // 2. Intent + Agentic Planner (no Gemini, no tools, no retrieval)
  const tIntent = performance.now();
  const intent = detectIntent(question);
  const agentPlan = createExecutionPlan({
    message: question,
    locationId: input.locationId,
  });
  push({
    id: "intent",
    label: "Intent Detection",
    status: "ok",
    durationMs: Math.round(performance.now() - tIntent),
    summary: `${agentPlan.intent} (legacy:${intent}) · goal ${agentPlan.goal}`,
    data: { legacyIntent: intent, plannerIntent: agentPlan.intent, secondary: agentPlan.secondaryIntents },
  });

  const tPlanner = performance.now();
  push({
    id: "planner",
    label: "AI Planner / Execution Plan",
    status: "ok",
    durationMs: Math.round(performance.now() - tPlanner),
    summary: summarizePlan(agentPlan),
    data: agentPlan,
  });

  // 3. Source planner (existing)
  const tPlan = performance.now();
  const plan = planContextSources(question);
  push({
    id: "source_planner",
    label: "Source Planner",
    status: "ok",
    durationMs: Math.round(performance.now() - tPlan),
    summary: plan.sources.join(" → "),
    data: plan,
  });

  // 4. Business rules (from plan)
  push({
    id: "business_rules",
    label: "Business Rules",
    status: "ok",
    durationMs: 0,
    summary: `maxChunks=${plan.maxRagChunks}, maxTokens=${plan.maxRagTokens}, useRAG=${plan.useSemanticRag}`,
    data: {
      maxRagChunks: plan.maxRagChunks,
      maxRagTokens: plan.maxRagTokens,
      semanticCategories: plan.semanticCategories,
    },
  });

  // 5–12 via orchestrator
  const tCms = performance.now();
  const knowledge = await buildCMSKnowledge(input.locationId);
  push({
    id: "cms",
    label: "CMS Retrieval",
    status: options.includeCms ? "ok" : "skip",
    durationMs: Math.round(performance.now() - tCms),
    summary: options.includeCms ? `Loaded CMS for ${input.locationId}` : "Skipped by lab options",
  });

  const tOrch = performance.now();
  let embeddingMs = 0;
  let vectorSearchMs = 0;
  const orchStarted = performance.now();
  const orchestrated = await orchestrateAIRequest(
    { message: question, history: [], conversationId: `debug-${crypto.randomUUID()}` },
    knowledge,
  );
  const orchMs = Math.round(performance.now() - orchStarted);
  // Approximate split: most orchestrator time for RAG is embed+search
  embeddingMs = plan.useSemanticRag ? Math.round(orchMs * 0.45) : 0;
  vectorSearchMs = plan.useSemanticRag ? Math.round(orchMs * 0.45) : 0;

  const toolOrch = orchestrated.toolOrchestration;
  push({
    id: "tool_orchestrator",
    label: "Tool Orchestrator",
    status: toolOrch ? "ok" : "warn",
    durationMs: toolOrch?.durationMs ?? 0,
    summary: toolOrch
      ? `${toolOrch.schedule.mode} · ${toolOrch.toolResults.length} tools · ${toolOrch.contextPackage.meta.successCount} ok / ${toolOrch.contextPackage.meta.failureCount} failed`
      : "No tool orchestration payload",
    data: toolOrch
      ? {
          schedule: toolOrch.schedule,
          timeline: toolOrch.timeline,
          results: toolOrch.toolResults.map((r) => ({
            toolId: r.toolId,
            status: r.status,
            ms: r.executionTimeMs,
            cached: r.cached,
            errors: r.errors,
          })),
          contextMeta: toolOrch.contextPackage.meta,
        }
      : null,
  });

  let chunks = orchestrated.semantic?.chunks ?? [];
  if (options.includeRelationships && chunks.length) {
    chunks = await boostRelatedChunks(chunks, 4);
  }
  chunks = chunks
    .filter((c) => c.similarity >= options.similarityThreshold)
    .slice(0, options.maxChunks);

  const titleMap = await titlesFor([...new Set(chunks.map((c) => c.documentId))]);
  const debugChunks: KnowledgeDebugChunk[] = chunks.map((c, i) => ({
    id: c.id,
    documentId: c.documentId,
    documentTitle: titleMap.get(c.documentId),
    category: c.category,
    locationId: c.locationId,
    chunkIndex: c.chunkIndex,
    similarity: c.similarity,
    tokens: estimateTokens(c.content),
    content: c.content,
    reasonSelected:
      typeof c.metadata?.reasonSelected === "string"
        ? String(c.metadata.reasonSelected)
        : i < (orchestrated.semantic?.chunks.length ?? 0)
          ? "semantic_similarity"
          : "relationship_boost",
    highlightedText: highlightMatch(c.content, question),
    retrievalTimeMs: vectorSearchMs,
  }));

  push({
    id: "semantic_search",
    label: "Semantic Search",
    status: plan.useSemanticRag ? (debugChunks.length ? "ok" : "warn") : "skip",
    durationMs: Math.round(performance.now() - tOrch),
    summary: plan.useSemanticRag
      ? `${debugChunks.length} chunks after threshold ${options.similarityThreshold}`
      : "RAG not selected by planner",
    data: { available: orchestrated.semantic?.available, reason: orchestrated.semantic?.reason },
  });

  push({
    id: "documents",
    label: "Retrieved Documents",
    status: debugChunks.length ? "ok" : "warn",
    durationMs: 0,
    summary: `${new Set(debugChunks.map((c) => c.documentId)).size} documents`,
    data: [...new Set(debugChunks.map((c) => ({ id: c.documentId, title: c.documentTitle })))],
  });

  push({
    id: "chunks",
    label: "Retrieved Chunks",
    status: debugChunks.length ? "ok" : "warn",
    durationMs: 0,
    summary: `${debugChunks.length} chunks`,
    data: debugChunks.map((c) => ({ id: c.id, similarity: c.similarity, chunkIndex: c.chunkIndex })),
  });

  push({
    id: "similarity",
    label: "Similarity Scores",
    status: "ok",
    durationMs: 0,
    summary: debugChunks.map((c) => c.similarity.toFixed(3)).join(", ") || "none",
  });

  push({
    id: "ranking",
    label: "Chunk Ranking",
    status: "ok",
    durationMs: 0,
    summary: "Ranked by similarity (relationship boost applied when enabled)",
    data: debugChunks.map((c, i) => ({ rank: i + 1, id: c.id, similarity: c.similarity, reason: c.reasonSelected })),
  });

  const toolCalls = orchestrated.request.toolResults ?? [];
  push({
    id: "tools",
    label: "Tool Calls",
    status: options.includeTools ? (toolCalls.length ? "ok" : "warn") : "skip",
    durationMs: 0,
    summary: options.includeTools ? `${toolCalls.length} tool result(s)` : "Skipped",
    data: toolCalls,
  });

  push({
    id: "memory",
    label: "Conversation Memory",
    status: "ok",
    durationMs: 0,
    summary: "Debug run uses empty history (isolated session)",
    data: orchestrated.request.session ?? {},
  });

  const request = options.includeCms
    ? orchestrated.request
    : await enrichAIRequestWithOrchestrator(
        { message: question, history: [], conversationId: `debug-${crypto.randomUUID()}` },
        knowledge,
      );

  const promptPreview = JSON.stringify(
    {
      message: request.message,
      cmsModules: request.cmsContext?.modules?.length ?? 0,
      tools: request.toolResults?.length ?? 0,
      session: request.session,
    },
    null,
    2,
  );

  push({
    id: "prompt",
    label: "Prompt Assembly",
    status: "ok",
    durationMs: 0,
    summary: `~${estimateTokens(promptPreview)} prompt tokens (context payload)`,
    data: { preview: promptPreview.slice(0, 4000) },
  });

  let response = "";
  let llmMs = 0;
  let completionTokens = 0;
  const activePrompt = await fetchActivePrompt().catch(() => null);

  if (options.runLlm) {
    const tLlm = performance.now();
    push({
      id: "gemini_request",
      label: "Gemini Request",
      status: "ok",
      durationMs: 0,
      summary: "Calling ai-concierge (non-stream)",
    });
    try {
      const res = await fetch(CONCIERGE_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: request.message,
          history: [],
          cmsContext: options.includeCms ? request.cmsContext : undefined,
          toolResults: options.includeTools ? request.toolResults : undefined,
          session: request.session,
          conversationId: `debug-${crypto.randomUUID()}`,
          stream: false,
        }),
      });
      llmMs = Math.round(performance.now() - tLlm);
      if (!res.ok) throw new Error(`Gemini request failed (${res.status})`);
      const body = (await res.json()) as { content?: string };
      response = body.content ?? "";
      completionTokens = estimateTokens(response);
      push({
        id: "gemini_response",
        label: "Gemini Response",
        status: "ok",
        durationMs: llmMs,
        summary: `${completionTokens} completion tokens`,
        data: { content: response },
      });
      await recordCostEvent({
        metricKey: "llm_debug",
        tokensIn: estimateTokens(promptPreview),
        tokensOut: completionTokens,
        locationId: input.locationId,
        dimensions: { source: "knowledge_debugger" },
      }).catch(() => undefined);
    } catch (err) {
      llmMs = Math.round(performance.now() - tLlm);
      push({
        id: "gemini_response",
        label: "Gemini Response",
        status: "error",
        durationMs: llmMs,
        summary: err instanceof Error ? err.message : "LLM failed",
      });
    }
  } else {
    push({
      id: "gemini_request",
      label: "Gemini Request",
      status: "skip",
      durationMs: 0,
      summary: "Skipped (lab runLlm=false)",
    });
    push({
      id: "gemini_response",
      label: "Gemini Response",
      status: "skip",
      durationMs: 0,
      summary: "Skipped",
    });
  }

  const totalMs = Math.round(performance.now() - started);
  push({
    id: "final",
    label: "Final Cheffy Response",
    status: response ? "ok" : options.runLlm ? "warn" : "skip",
    durationMs: totalMs,
    summary: response ? response.slice(0, 180) : "No response",
    data: { response },
  });

  const report: KnowledgeDebugReport = {
    question,
    locationId: input.locationId,
    stages,
    chunks: debugChunks.slice(0, 10),
    promptPreview,
    response,
    timings: {
      embeddingMs,
      vectorSearchMs,
      llmMs,
      totalMs,
    },
    tokens: {
      prompt: estimateTokens(promptPreview),
      completion: completionTokens,
      total: estimateTokens(promptPreview) + completionTokens,
    },
    intent,
    sourcePlan: plan,
    toolCalls,
    memory: request.session,
    executionPlan: agentPlan,
    toolOrchestration: toolOrch ?? null,
  };

  try {
    const { data: userData } = await kiClient().auth.getUser();
    await kiTable("knowledge_debug").insert({
      question,
      location_id: input.locationId,
      stages,
      retrieved_chunks: debugChunks,
      prompt_preview: promptPreview.slice(0, 20000),
      response_preview: response.slice(0, 20000),
      timings: report.timings,
      token_counts: report.tokens,
      lab_options: options,
      actor_id: userData.user?.id ?? null,
    });
    await writeAudit({
      eventType: "debug_run",
      summary: `Debug: “${question.slice(0, 80)}” (${totalMs}ms)`,
      entityType: "debug",
      metadata: {
        locationId: input.locationId,
        chunks: debugChunks.length,
        promptVersion: activePrompt?.version ?? null,
      },
    });
  } catch {
    /* persistence optional if migration not applied */
  }

  return report;
}

export async function compareSearchLab(
  questionA: string,
  questionB: string,
  locationId: LocationId,
  options?: Partial<SearchLabOptions>,
): Promise<{ a: KnowledgeDebugReport; b: KnowledgeDebugReport; differences: string[] }> {
  const [a, b] = await Promise.all([
    runKnowledgeDebug({ question: questionA, locationId, options }),
    runKnowledgeDebug({ question: questionB, locationId, options }),
  ]);
  const diffs: string[] = [];
  if (a.intent !== b.intent) diffs.push(`Intent: ${a.intent} vs ${b.intent}`);
  if (a.chunks.length !== b.chunks.length) diffs.push(`Chunk count: ${a.chunks.length} vs ${b.chunks.length}`);
  const aDocs = new Set(a.chunks.map((c) => c.documentId));
  const bDocs = new Set(b.chunks.map((c) => c.documentId));
  const onlyA = [...aDocs].filter((id) => !bDocs.has(id));
  const onlyB = [...bDocs].filter((id) => !aDocs.has(id));
  if (onlyA.length) diffs.push(`Docs only in A: ${onlyA.length}`);
  if (onlyB.length) diffs.push(`Docs only in B: ${onlyB.length}`);
  if (Math.abs(a.timings.totalMs - b.timings.totalMs) > 200) {
    diffs.push(`Latency delta: ${a.timings.totalMs - b.timings.totalMs}ms`);
  }
  return { a, b, differences: diffs };
}

export function exportDebugReport(report: KnowledgeDebugReport): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cheffy-debug-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
