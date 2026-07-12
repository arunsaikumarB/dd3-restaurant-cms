import { opsTable } from "./client";
import { listWorkflows } from "./workflowAnalytics";
import { getPlannerAnalytics } from "./plannerAnalytics";
import { getPerformanceAnalytics } from "./performanceAnalytics";
import type { OpsRecommendation } from "./types";

export async function generateOpsRecommendations(): Promise<OpsRecommendation[]> {
  const [workflows, planner, perf] = await Promise.all([
    listWorkflows(250),
    getPlannerAnalytics(250),
    getPerformanceAnalytics(150),
  ]);

  const recs: OpsRecommendation[] = [];
  const intentMap = new Map<string, number>();
  for (const w of workflows) {
    intentMap.set(w.intent, (intentMap.get(w.intent) ?? 0) + 1);
  }

  for (const [intent, count] of [...intentMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)) {
    if (count >= 5 && intent !== "greeting") {
      recs.push({
        id: crypto.randomUUID(),
        type: "create_faq",
        title: `Create FAQ for “${intent}”`,
        reason: `${count} recent workflows matched intent “${intent}”.`,
        priority: count >= 20 ? "high" : "medium",
        status: "open",
        evidence: { intent, count },
      });
    }
  }

  const lowConf = workflows.filter((w) => (w.confidence ?? 1) < 0.45);
  if (lowConf.length >= 5) {
    recs.push({
      id: crypto.randomUUID(),
      type: "upload_knowledge",
      title: "Upload knowledge for low-confidence topics",
      reason: `${lowConf.length} workflows scored low confidence.`,
      priority: "high",
      status: "open",
      evidence: { samples: lowConf.slice(0, 5).map((w) => w.messagePreview) },
    });
  }

  if (planner.unknownIntents >= 5) {
    recs.push({
      id: crypto.randomUUID(),
      type: "optimize_planner",
      title: "Improve Planner intent coverage",
      reason: `${planner.unknownIntents} unknown intents detected.`,
      priority: "medium",
      status: "open",
    });
  }

  if (planner.clarificationRate > 35) {
    recs.push({
      id: crypto.randomUUID(),
      type: "improve_prompt",
      title: "Tighten clarification prompts",
      reason: `Clarification rate is ${planner.clarificationRate}%.`,
      priority: "medium",
      status: "open",
    });
  }

  for (const d of perf.detections) {
    recs.push({
      id: crypto.randomUUID(),
      type: "bottleneck",
      title: d,
      reason: "Detected by AI bottleneck engine from recent workflow timings.",
      priority: d.toLowerCase().includes("slow gemini") ? "high" : "medium",
      status: "open",
    });
  }

  if (workflows.filter((w) => w.needsEscalation).length >= 8) {
    recs.push({
      id: crypto.randomUUID(),
      type: "improve_policy",
      title: "Review escalation policies",
      reason: "Elevated escalation volume — clarify policies or add knowledge.",
      priority: "high",
      status: "open",
    });
  }

  if (!recs.length) {
    recs.push({
      id: crypto.randomUUID(),
      type: "monitor",
      title: "Platform healthy — keep monitoring",
      reason: "No critical gaps detected from recent workflows.",
      priority: "low",
      status: "open",
    });
  }

  void persistRecommendations(recs);
  return recs;
}

async function persistRecommendations(recs: OpsRecommendation[]): Promise<void> {
  try {
    const t = opsTable("agent_recommendations");
    if (!t) return;
    await t.insert(
      recs.slice(0, 12).map((r) => ({
        recommendation_type: r.type,
        title: r.title,
        reason: r.reason,
        priority: r.priority,
        status: r.status,
        evidence: r.evidence ?? {},
      })),
    );
  } catch {
    /* optional */
  }
}

export async function listStoredRecommendations(limit = 40): Promise<OpsRecommendation[]> {
  try {
    const t = opsTable("agent_recommendations");
    if (!t) return generateOpsRecommendations();
    const { data } = await t.select("*").order("created_at", { ascending: false }).limit(limit);
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    if (!rows.length) return generateOpsRecommendations();
    return rows.map((r) => ({
      id: String(r.id),
      type: String(r.recommendation_type),
      title: String(r.title),
      reason: String(r.reason ?? ""),
      priority: (r.priority as OpsRecommendation["priority"]) ?? "medium",
      status: String(r.status ?? "open"),
      evidence: (r.evidence as Record<string, unknown>) ?? {},
    }));
  } catch {
    return generateOpsRecommendations();
  }
}
