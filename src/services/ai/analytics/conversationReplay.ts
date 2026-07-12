import { getWorkflow } from "./workflowAnalytics";
import { opsTable } from "./client";
import type { ReplayStep, WorkflowRecord } from "./types";

export async function buildConversationReplay(workflowId: string): Promise<{
  workflow: WorkflowRecord;
  steps: ReplayStep[];
} | null> {
  const workflow = await getWorkflow(workflowId);
  if (!workflow) return null;

  let planJson: unknown = null;
  let packageJson: unknown = null;
  let reflectionJson: unknown = null;

  try {
    if (workflow.planId) {
      const plans = opsTable("agent_execution_plans");
      if (plans) {
        const { data } = await plans.select("plan_json").eq("id", workflow.planId).maybeSingle();
        planJson = (data as { plan_json?: unknown } | null)?.plan_json ?? null;
      }
    }
    if (workflow.packageId) {
      const pkgs = opsTable("agent_context_packages");
      if (pkgs) {
        const { data } = await pkgs
          .select("package_json, timeline_json")
          .eq("id", workflow.packageId)
          .maybeSingle();
        packageJson = data ?? null;
      }
    }
    if (workflow.reflectionId) {
      const refs = opsTable("agent_reflections");
      if (refs) {
        const { data } = await refs
          .select("reflection_json")
          .eq("id", workflow.reflectionId)
          .maybeSingle();
        reflectionJson = (data as { reflection_json?: unknown } | null)?.reflection_json ?? null;
      }
    }
  } catch {
    /* best effort enrichment */
  }

  const raw = workflow.raw ?? {};
  const steps: ReplayStep[] = [
    {
      id: "planner",
      label: "Planner Output",
      status: "ok",
      summary: `${workflow.intent} → ${workflow.goal} (${workflow.complexity})`,
      data: planJson ?? { intent: workflow.intent, goal: workflow.goal },
      durationMs: workflow.timings.plannerMs,
    },
    {
      id: "execution_plan",
      label: "Execution Plan",
      status: "ok",
      summary: `Plan ${workflow.planId?.slice(0, 8) ?? "—"}`,
      data: planJson ?? workflow.stages,
      durationMs: workflow.timings.plannerMs,
    },
    {
      id: "tools",
      label: "Tool Execution",
      status: workflow.toolFailureCount ? "warn" : "ok",
      summary: `${workflow.toolSuccessCount} ok / ${workflow.toolFailureCount} failed · ${workflow.timings.toolMs}ms`,
      data: packageJson ?? workflow.timeline.filter((e) => e.type.startsWith("tool")),
      durationMs: workflow.timings.toolMs,
    },
    {
      id: "rag",
      label: "Retrieved RAG",
      status: "ok",
      summary: `Retrieval ${workflow.timings.retrievalMs}ms`,
      data: workflow.timeline.filter((e) => e.type === "retrieval"),
      durationMs: workflow.timings.retrievalMs,
    },
    {
      id: "context",
      label: "Context Package",
      status: "ok",
      summary: `Package ${workflow.packageId?.slice(0, 8) ?? "—"}`,
      data: packageJson ?? raw.contextPackage ?? null,
      durationMs: workflow.timings.aggregationMs,
    },
    {
      id: "prompt",
      label: "Gemini Prompt",
      status: "ok",
      summary: "Assembled context sent to Gemini (not rewritten by Reflection)",
      data: raw.promptPreview ?? { message: workflow.messagePreview },
      durationMs: 0,
    },
    {
      id: "gemini",
      label: "Gemini Response",
      status: "ok",
      summary: workflow.geminiPreview.slice(0, 120) || "—",
      data: { content: workflow.geminiPreview },
      durationMs: workflow.timings.geminiMs,
    },
    {
      id: "reflection",
      label: "Reflection",
      status: workflow.needsEscalation || workflow.needsFollowUp ? "warn" : "ok",
      summary: `confidence ${workflow.confidence ?? "—"} · ${workflow.nextAction ?? "accept"}`,
      data: reflectionJson ?? {
        confidence: workflow.confidence,
        nextAction: workflow.nextAction,
        needsFollowUp: workflow.needsFollowUp,
        needsEscalation: workflow.needsEscalation,
      },
      durationMs: workflow.timings.reflectionMs,
    },
    {
      id: "final",
      label: "Final Response",
      status: "ok",
      summary: workflow.finalPreview.slice(0, 120) || "—",
      data: { content: workflow.finalPreview },
      durationMs: workflow.timings.totalMs,
    },
  ];

  return { workflow, steps };
}
