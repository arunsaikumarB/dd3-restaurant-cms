import type { RegisteredToolId } from "./types";

type BreakerState = {
  failures: number;
  openUntil: number;
};

const breakers = new Map<string, BreakerState>();

const FAILURE_THRESHOLD = 3;
const OPEN_MS = 30_000;

export function isCircuitOpen(toolId: RegisteredToolId): boolean {
  const state = breakers.get(String(toolId));
  if (!state) return false;
  if (Date.now() < state.openUntil) return true;
  breakers.delete(String(toolId));
  return false;
}

export function recordCircuitSuccess(toolId: RegisteredToolId): void {
  breakers.delete(String(toolId));
}

export function recordCircuitFailure(toolId: RegisteredToolId): void {
  const key = String(toolId);
  const state = breakers.get(key) ?? { failures: 0, openUntil: 0 };
  state.failures += 1;
  if (state.failures >= FAILURE_THRESHOLD) {
    state.openUntil = Date.now() + OPEN_MS;
  }
  breakers.set(key, state);
}
