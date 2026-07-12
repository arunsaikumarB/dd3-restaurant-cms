/**
 * Workflow automation smoke checks (Feature 17 — local assertions).
 */
import { evaluateCondition } from "./businessRules";
import { makeIdempotencyKey } from "./client";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

export function runWorkflowSmoke(): void {
  assert(evaluateCondition({ field: "guests", op: "gt", value: 20 }, { guests: 25 }), "large party");
  assert(!evaluateCondition({ field: "guests", op: "gt", value: 20 }, { guests: 10 }), "small party");
  assert(
    evaluateCondition({ field: "occasion", op: "eq", value: "birthday" }, { occasion: "birthday" }),
    "birthday",
  );
  assert(evaluateCondition({}, { anything: 1 }), "empty condition always true");

  const k1 = makeIdempotencyKey(["ReservationCreated", "r1", "c1"]);
  const k2 = makeIdempotencyKey(["ReservationCreated", "r1", "c1"]);
  assert(k1 === k2, "idempotency key stable");

  console.log("[workflow.smoke] all assertions passed");
}

if (typeof process !== "undefined" && process.argv?.[1]?.includes("workflow.smoke")) {
  runWorkflowSmoke();
}
