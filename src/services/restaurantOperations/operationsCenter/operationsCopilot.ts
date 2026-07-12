/**
 * Operations Copilot — uses existing Planner + Context Aggregator + Tool Orchestrator.
 * Does not build a second AI system.
 */

import { buildCMSKnowledge } from "../../cms/knowledge";
import { generateResponse, orchestrateAIRequest } from "../../ai";
import { getCrmDashboard, listCustomers } from "../crm";
import { getJourneyAnalytics, listCustomerJourneys } from "../journey";
import { listReservationsForDate } from "../reservations";
import { getWorkflowAnalytics, listApprovals, listDeadLetters, listTasks } from "../automation";
import { listLeads } from "../events";
import { todayIso } from "./client";
import { buildExecutiveDashboard } from "./dashboardService";
import { generateOpsInsights } from "./insightEngine";
import type { CopilotReply } from "./types";

async function gatherOpsBrief(locationId: string): Promise<string> {
  const today = todayIso();
  const [dash, crm, wf, journey, approvals, dead, tasks, reservations, insights, leads, vipToday, journeys] =
    await Promise.all([
      buildExecutiveDashboard(locationId),
      getCrmDashboard(locationId),
      getWorkflowAnalytics(locationId),
      getJourneyAnalytics(locationId),
      listApprovals({ locationId, status: "pending" }),
      listDeadLetters({ locationId, status: "open" }),
      listTasks({ locationId, status: "open" }),
      listReservationsForDate(locationId, today),
      generateOpsInsights(locationId),
      listLeads({ locationId, limit: 50 }),
      listCustomers({ locationId, vipOnly: true, limit: 20 }),
      listCustomerJourneys({ locationId, limit: 100 }),
    ]);

  const pendingConfirm = reservations.filter((r) => r.status === "pending");
  const churn = journeys.filter((j) => j.stageCode === "at_risk" || j.scores.churnRisk >= 50);

  return [
    `Location: ${locationId} · Date: ${today}`,
    `KPIs: reservations=${dash.kpis.todaysReservations}, seated=${dash.kpis.guestsSeated}, waitlist=${dash.kpis.waitlist}, availableTables=${dash.kpis.availableTables}, health=${dash.kpis.healthScore}`,
    `CRM: vip=${crm.vipCount}, birthdaysToday=${crm.birthdaysToday}, anniversaries=${crm.anniversariesToday}`,
    `VIP names: ${vipToday
      .slice(0, 10)
      .map((c) => `${c.firstName} ${c.lastName}`.trim())
      .filter(Boolean)
      .join(", ") || "none listed"}`,
    `Workflow: success=${wf.successRate}%, failures=${wf.failureRate}%, DLQ=${dead.length}, pendingApprovals=${approvals.length}, openTasks=${tasks.length}`,
    `Journey: retention=${journey.retentionRate}%, churnRisk=${journey.churnRiskCount}, avgRelationship=${journey.avgRelationshipScore}`,
    `Pending reservation confirmations: ${pendingConfirm.length}`,
    `Catering open leads: ${leads.filter((l) => !["lost", "cancelled", "completed"].includes(l.status)).length}`,
    `Pending catering approvals: ${approvals.filter((a) => (a.stage ?? "").toLowerCase().includes("quote") || (a.title ?? "").toLowerCase().includes("cater")).length}`,
    `Churn-risk customers: ${churn.length}`,
    `Insights: ${insights.map((i) => i.title).join(" | ")}`,
  ].join("\n");
}

/**
 * Ask the Operations Copilot a manager question.
 * Routes through orchestrateAIRequest (Planner → Tool Orchestrator → Context Aggregator).
 */
export async function askOperationsCopilot(input: {
  locationId: string;
  question: string;
  conversationId?: string;
}): Promise<CopilotReply> {
  const brief = await gatherOpsBrief(input.locationId);
  const knowledge = await buildCMSKnowledge(input.locationId as never);
  const message = [
    "You are the Restaurant Operations Copilot for managers.",
    "Answer using the operations brief and any tools. Be concise and actionable.",
    "",
    "OPERATIONS BRIEF:",
    brief,
    "",
    "MANAGER QUESTION:",
    input.question.trim(),
  ].join("\n");

  const orchestrated = await orchestrateAIRequest(
    {
      message,
      conversationId: input.conversationId ?? `ops-copilot-${input.locationId}`,
      history: [],
    },
    knowledge,
  );

  const response = await generateResponse(orchestrated.request);
  const planId = orchestrated.executionPlan?.planId ?? null;
  const intent = orchestrated.executionPlan?.intent ?? orchestrated.plan?.intent ?? null;
  const usedModules = [
    "planner",
    "tool_orchestrator",
    "reservations",
    "crm",
    "journey",
    "workflow",
    "catering",
  ];

  return {
    answer: response.content?.trim() || "I could not generate an answer right now.",
    planId: planId ? String(planId) : null,
    intent: intent ? String(intent) : null,
    usedModules,
    contextSummary: brief.slice(0, 500),
  };
}

/** Deterministic shortcuts for common mission-control questions (still consumes live APIs). */
export async function quickOpsAnswer(
  locationId: string,
  question: string,
): Promise<string | null> {
  const q = question.toLowerCase();
  const briefParts = await gatherOpsBrief(locationId);

  if (q.includes("vip") && (q.includes("today") || q.includes("arriv"))) {
    const line = briefParts.split("\n").find((l) => l.startsWith("VIP names:"));
    const crm = briefParts.split("\n").find((l) => l.startsWith("CRM:"));
    return [crm, line].filter(Boolean).join("\n");
  }
  if (q.includes("workflow") && q.includes("fail")) {
    return briefParts.split("\n").find((l) => l.startsWith("Workflow:")) ?? null;
  }
  if (q.includes("birthday")) {
    return briefParts.split("\n").find((l) => l.startsWith("CRM:")) ?? null;
  }
  if (q.includes("catering") && q.includes("approval")) {
    return briefParts.split("\n").find((l) => l.startsWith("Pending catering")) ?? null;
  }
  if (q.includes("confirmation") || (q.includes("waiting") && q.includes("reserv"))) {
    return briefParts.split("\n").find((l) => l.startsWith("Pending reservation")) ?? null;
  }
  if (q.includes("churn")) {
    return briefParts.split("\n").find((l) => l.startsWith("Churn-risk")) ?? null;
  }
  if (q.includes("summary") || q.includes("overview")) {
    return briefParts;
  }
  return null;
}
