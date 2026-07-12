/**
 * Deterministic planner smoke checks — run with:
 * npx tsx src/services/ai/planner/planner.smoke.ts
 */
import { createExecutionPlan } from "./planner";

const cases: Array<{ name: string; message: string; expect: Partial<{ intent: string; goal: string; complexity: string }> }> = [
  { name: "Greeting", message: "Hello!", expect: { intent: "greeting", complexity: "simple" } },
  { name: "Menu", message: "What is on the menu?", expect: { intent: "menu_inquiry" } },
  { name: "Reservation incomplete", message: "I need a reservation.", expect: { intent: "reservation", goal: "book_table" } },
  { name: "Unknown", message: "xyz abc", expect: { intent: "unknown" } },
  { name: "Complaint", message: "I want to file a complaint about terrible service", expect: { intent: "complaint" } },
  {
    name: "Multi-intent complex",
    message: "I need catering for 60 people, party booking and birthday decorations",
    expect: { complexity: "complex" },
  },
  { name: "Spicy recommend", message: "I want something spicy.", expect: { goal: "recommend_dish" } },
  { name: "Forgot reservation", message: "I forgot my reservation", expect: { goal: "retrieve_reservation" } },
];

let failed = 0;
for (const c of cases) {
  const plan = createExecutionPlan({ message: c.message, locationId: "oak-tree" });
  const issues: string[] = [];
  if (c.expect.intent && plan.intent !== c.expect.intent) issues.push(`intent ${plan.intent} != ${c.expect.intent}`);
  if (c.expect.goal && plan.goal !== c.expect.goal) issues.push(`goal ${plan.goal} != ${c.expect.goal}`);
  if (c.expect.complexity && plan.complexity !== c.expect.complexity) {
    issues.push(`complexity ${plan.complexity} != ${c.expect.complexity}`);
  }
  // Invariants
  if (plan.confidence < 0 || plan.confidence > 1) issues.push("confidence out of range");
  if (!plan.planId || !plan.workflow.length) issues.push("missing planId/workflow");
  if (issues.length) {
    failed += 1;
    console.error(`FAIL ${c.name}:`, issues, plan);
  } else {
    console.log(`OK   ${c.name}: ${plan.intent} / ${plan.goal} / ${plan.complexity} / ${plan.confidence}`);
  }
}

if (failed) {
  console.error(`\n${failed} case(s) failed`);
  process.exit(1);
}
console.log("\nAll planner smoke cases passed.");
