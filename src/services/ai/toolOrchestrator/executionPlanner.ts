import type { AgentExecutionPlan } from "../planner/types";
import type { ExecutionMode, ExecutionSchedule, RegisteredToolId } from "./types";
import { resolveDependencyOrder } from "./dependencyResolver";
import { hasOrchestratorTool } from "./toolRegistry";

/**
 * Build execution schedule from Planner output.
 * Planner decides WHAT; this only decides WHEN/HOW (order + parallelism).
 */
export function buildExecutionSchedule(plan: AgentExecutionPlan): ExecutionSchedule {
  const fromTools = plan.requiredTools.filter((t) => hasOrchestratorTool(t));
  const fromSources = plan.knowledgeSources.filter((s) =>
    ["cms", "semantic_rag", "offers", "reviews", "gallery", "restaurant_settings", "business_rules"].includes(s),
  ) as RegisteredToolId[];

  const combined = dedupe([...fromTools, ...fromSources]);
  const ordered = resolveDependencyOrder(combined);
  const mode = inferMode(plan, ordered);
  const groups = buildGroups(mode, ordered);

  return { mode, groups, orderedToolIds: ordered };
}

function inferMode(plan: AgentExecutionPlan, tools: RegisteredToolId[]): ExecutionMode {
  if (tools.length <= 1) return "sequential";
  const transactional = tools.some((t) => ["reservation", "catering", "menu"].includes(String(t)));
  const independentHeavy = tools.filter((t) =>
    ["offers", "reviews", "gallery", "cms", "semantic_rag"].includes(String(t)),
  );
  if (transactional && independentHeavy.length >= 2) return "mixed";
  if (!transactional && tools.length >= 2) return "parallel";
  if (plan.complexity === "simple") return "parallel";
  return "sequential";
}

function buildGroups(mode: ExecutionMode, ordered: RegisteredToolId[]): ExecutionSchedule["groups"] {
  if (!ordered.length) return [];

  if (mode === "parallel") {
    return [{ id: "parallel-all", mode: "parallel", toolIds: ordered, dependsOn: [] }];
  }

  if (mode === "sequential") {
    return ordered.map((id, i) => ({
      id: `seq-${i}-${id}`,
      mode: "sequential" as const,
      toolIds: [id],
      dependsOn: i === 0 ? [] : [`seq-${i - 1}-${ordered[i - 1]}`],
    }));
  }

  const primary = ordered.filter((t) =>
    ["reservation", "catering", "menu", "hours", "contact", "location"].includes(String(t)),
  );
  const rest = ordered.filter((t) => !primary.includes(t));
  const groups: ExecutionSchedule["groups"] = [];

  primary.forEach((id, i) => {
    groups.push({
      id: `primary-${i}`,
      mode: "sequential",
      toolIds: [id],
      dependsOn: i === 0 ? [] : [`primary-${i - 1}`],
    });
  });

  if (rest.length) {
    groups.push({
      id: "parallel-aux",
      mode: "parallel",
      toolIds: rest,
      dependsOn: primary.length ? [`primary-${primary.length - 1}`] : [],
    });
  }

  return groups;
}

function dedupe(ids: RegisteredToolId[]): RegisteredToolId[] {
  const seen = new Set<string>();
  const out: RegisteredToolId[] = [];
  for (const id of ids) {
    if (seen.has(String(id))) continue;
    seen.add(String(id));
    out.push(id);
  }
  return out;
}
