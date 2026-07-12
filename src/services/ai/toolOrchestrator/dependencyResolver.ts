import type { RegisteredToolId, ToolAdapter } from "./types";
import { getOrchestratorTool } from "./toolRegistry";

/** Resolve dependency order (Kahn). Unknown deps are ignored. */
export function resolveDependencyOrder(toolIds: RegisteredToolId[]): RegisteredToolId[] {
  const unique = [...new Set(toolIds)];
  const deps = new Map<RegisteredToolId, RegisteredToolId[]>();
  for (const id of unique) {
    const adapter = getOrchestratorTool(id);
    const required = (adapter?.dependsOn ?? []).filter((d) => unique.includes(d));
    deps.set(id, required);
  }

  const remaining = new Set(unique);
  const ordered: RegisteredToolId[] = [];

  while (remaining.size) {
    const ready = [...remaining].filter((id) => (deps.get(id) ?? []).every((d) => ordered.includes(d)));
    if (!ready.length) {
      // Cycle — append rest in original order
      ordered.push(...remaining);
      break;
    }
    for (const id of ready) {
      ordered.push(id);
      remaining.delete(id);
    }
  }

  return ordered;
}

export function adaptersFor(toolIds: RegisteredToolId[]): ToolAdapter[] {
  return toolIds.map((id) => getOrchestratorTool(id)).filter((a): a is ToolAdapter => Boolean(a));
}
