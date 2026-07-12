/**
 * Configurable business rules — never hardcoded in Reservation/CRM/Events.
 */

import { listRules } from "./repository";
import type { DomainEvent, RuleOperator, WorkflowRule } from "./types";

export function evaluateCondition(
  condition: { field?: string; op?: RuleOperator; value?: unknown },
  payload: Record<string, unknown>,
): boolean {
  if (!condition.field && !condition.op) return true;
  const field = condition.field;
  if (!field) return true;
  const actual = payload[field];
  const op = condition.op ?? "eq";
  const expected = condition.value;

  switch (op) {
    case "exists":
      return actual != null && actual !== "";
    case "eq":
      return actual === expected || String(actual) === String(expected);
    case "neq":
      return actual !== expected && String(actual) !== String(expected);
    case "gt":
      return Number(actual) > Number(expected);
    case "gte":
      return Number(actual) >= Number(expected);
    case "lt":
      return Number(actual) < Number(expected);
    case "lte":
      return Number(actual) <= Number(expected);
    case "contains":
      return String(actual ?? "")
        .toLowerCase()
        .includes(String(expected ?? "").toLowerCase());
    default:
      return false;
  }
}

export async function matchingRulesForEvent(event: DomainEvent): Promise<WorkflowRule[]> {
  const rules = await listRules(event.locationId ?? undefined);
  return rules
    .filter((r) => !r.eventType || r.eventType === event.eventType)
    .filter((r) => evaluateCondition(r.condition, event.payload))
    .sort((a, b) => a.priority - b.priority);
}

export function nodeConditionPasses(
  config: Record<string, unknown> | undefined,
  payload: Record<string, unknown>,
): boolean {
  if (!config) return true;
  return evaluateCondition(
    {
      field: config.field as string | undefined,
      op: config.op as RuleOperator | undefined,
      value: config.value,
    },
    payload,
  );
}
