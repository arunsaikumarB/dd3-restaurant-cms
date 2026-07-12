import type { RegisteredToolId, ToolAdapter } from "./types";

const registry = new Map<RegisteredToolId, ToolAdapter>();

/** Register a tool adapter — future tools plug in here without changing the core. */
export function registerOrchestratorTool(adapter: ToolAdapter): void {
  registry.set(adapter.id, adapter);
}

export function getOrchestratorTool(id: RegisteredToolId): ToolAdapter | undefined {
  return registry.get(id);
}

export function listOrchestratorTools(): ToolAdapter[] {
  return [...registry.values()];
}

export function hasOrchestratorTool(id: RegisteredToolId): boolean {
  return registry.has(id);
}

/** Test helper */
export function clearOrchestratorRegistry(): void {
  registry.clear();
}
