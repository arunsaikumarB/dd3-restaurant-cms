/**
 * Configurable lifecycle stage evaluation — no hardcoded transitions in CRM/Reservation.
 */

import type { JourneyCondition, JourneyRule, JourneyRuleOp, JourneySignals } from "./types";

export function evaluateJourneyCondition(
  condition: JourneyCondition,
  signals: Record<string, unknown>,
): boolean {
  if ("all" in condition) {
    return condition.all.every((c) => evaluateJourneyCondition(c, signals));
  }
  if ("any" in condition) {
    return condition.any.some((c) => evaluateJourneyCondition(c, signals));
  }
  if (!condition.field && !condition.op) return true;
  const field = condition.field;
  if (!field) return true;
  const actual = signals[field];
  const op = (condition.op ?? "eq") as JourneyRuleOp;
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
      return actual != null && Number(actual) <= Number(expected);
    case "contains":
      return String(actual ?? "")
        .toLowerCase()
        .includes(String(expected ?? "").toLowerCase());
    default:
      return false;
  }
}

const STAGE_RANK: Record<string, number> = {
  visitor: 10,
  first_reservation: 20,
  first_visit: 30,
  returning: 40,
  frequent: 50,
  vip: 60,
  loyal: 70,
  inactive: 15,
  at_risk: 12,
  win_back: 18,
  reactivated: 45,
  advocate: 80,
};

export function stageRank(code: string): number {
  return STAGE_RANK[code] ?? 0;
}

/**
 * Deterministic stage resolution:
 * 1) Evaluate matching rules by priority
 * 2) Prefer highest-rank progressive stage among matches
 * 3) Risk/inactive stages override when their rules match and customer was previously active
 */
export function resolveLifecycleStage(input: {
  currentStage: string;
  rules: JourneyRule[];
  signals: JourneySignals;
}): { stage: string; matchedRule: JourneyRule | null } {
  const signals = input.signals as unknown as Record<string, unknown>;
  const matched = input.rules
    .filter((r) => r.active)
    .filter((r) => !r.fromStage || r.fromStage === input.currentStage)
    .filter((r) => evaluateJourneyCondition(r.condition, signals))
    .sort((a, b) => a.priority - b.priority);

  if (!matched.length) return { stage: input.currentStage, matchedRule: null };

  const riskish = matched.filter((r) =>
    ["inactive", "at_risk", "win_back"].includes(r.toStage),
  );
  const progressive = matched.filter(
    (r) => !["inactive", "at_risk", "win_back"].includes(r.toStage),
  );

  // If inactive/at-risk rules match and days since visit justify, prefer them
  if (riskish.length && (Number(signals.daysSinceLastVisit) ?? 0) >= 60) {
    const bestRisk = [...riskish].sort(
      (a, b) => stageRank(b.toStage) - stageRank(a.toStage),
    )[0]!;
    // Reactivation: if visits recent again, skip risk
    if ((Number(signals.daysSinceLastVisit) ?? 999) < 30 && progressive.length) {
      /* fall through */
    } else {
      return { stage: bestRisk.toStage, matchedRule: bestRisk };
    }
  }

  if (!progressive.length) {
    const r = riskish[0] ?? matched[0]!;
    return { stage: r.toStage, matchedRule: r };
  }

  const best = [...progressive].sort(
    (a, b) => stageRank(b.toStage) - stageRank(a.toStage),
  )[0]!;

  // Never silently downgrade progressive rank unless risk path
  if (stageRank(best.toStage) < stageRank(input.currentStage)) {
    return { stage: input.currentStage, matchedRule: null };
  }

  return { stage: best.toStage, matchedRule: best };
}

export function signalsToRecord(s: JourneySignals): Record<string, unknown> {
  return { ...s };
}
