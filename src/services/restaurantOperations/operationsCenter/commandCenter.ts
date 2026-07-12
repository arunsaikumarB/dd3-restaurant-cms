/**
 * Command Center — quick actions that deep-link / invoke existing module APIs.
 * Never reimplements Reservation / CRM / Catering / Workflow engines.
 */

import { insertAnnouncement } from "./repository";
import { computeRestaurantHealth } from "./operationsHealth";
import { generateOpsReport } from "./reportEngine";
import { syncOperationalAlerts } from "./alertCenter";
import { buildForecasts } from "./forecastingEngine";
import type { OpsAnnouncement } from "./types";

export type CommandActionId =
  | "create_reservation"
  | "create_catering_lead"
  | "search_customer"
  | "assign_table"
  | "approve_quote"
  | "resolve_workflow"
  | "publish_announcement"
  | "run_health_check"
  | "generate_report";

export type CommandAction = {
  id: CommandActionId;
  label: string;
  description: string;
  href?: string;
};

export const COMMAND_ACTIONS: CommandAction[] = [
  {
    id: "create_reservation",
    label: "Create Reservation",
    description: "Open reservation floor board",
    href: "/admin/operations/reservations?tab=reservations",
  },
  {
    id: "create_catering_lead",
    label: "Create Catering Lead",
    description: "Open catering & events",
    href: "/admin/operations/events?tab=leads",
  },
  {
    id: "search_customer",
    label: "Search Customer",
    description: "Open CRM directory",
    href: "/admin/operations/crm",
  },
  {
    id: "assign_table",
    label: "Assign Table",
    description: "Open table map",
    href: "/admin/operations/reservations?tab=tables",
  },
  {
    id: "approve_quote",
    label: "Approve Quote",
    description: "Open catering approvals",
    href: "/admin/operations/events?tab=approvals",
  },
  {
    id: "resolve_workflow",
    label: "Resolve Workflow",
    description: "Open workflow dead letter / tasks",
    href: "/admin/operations/workflows?tab=deadletter",
  },
  {
    id: "publish_announcement",
    label: "Publish Announcement",
    description: "Broadcast to operations team",
  },
  {
    id: "run_health_check",
    label: "Run AI Health Check",
    description: "Recalculate restaurant health + alerts",
  },
  {
    id: "generate_report",
    label: "Generate Report",
    description: "Create daily operations report",
  },
];

export async function runCommandAction(
  actionId: CommandActionId,
  opts: {
    locationId: string;
    announcementTitle?: string;
    announcementBody?: string;
  },
): Promise<{ ok: boolean; message: string; href?: string; announcement?: OpsAnnouncement | null }> {
  const action = COMMAND_ACTIONS.find((a) => a.id === actionId);
  if (!action) return { ok: false, message: "Unknown action" };

  if (action.href) {
    return { ok: true, message: `Navigate to ${action.label}`, href: action.href };
  }

  if (actionId === "publish_announcement") {
    const row = await insertAnnouncement({
      locationId: opts.locationId,
      title: opts.announcementTitle || "Operations announcement",
      body: opts.announcementBody || "Please check Mission Control for updates.",
    });
    return {
      ok: Boolean(row),
      message: row ? "Announcement published" : "Could not publish (DB unavailable)",
      announcement: row,
    };
  }

  if (actionId === "run_health_check") {
    const [health] = await Promise.all([
      computeRestaurantHealth(opts.locationId),
      syncOperationalAlerts(opts.locationId),
      buildForecasts(opts.locationId, 7),
    ]);
    return {
      ok: true,
      message: `Health score ${health.overallScore}. ${health.suggestions[0] ?? ""}`,
    };
  }

  if (actionId === "generate_report") {
    const report = await generateOpsReport({
      locationId: opts.locationId,
      period: "daily",
      category: "operations",
      format: "csv",
    });
    return {
      ok: Boolean(report),
      message: report ? `Report ready: ${report.title}` : "Could not generate report",
      href: "/admin/operations?tab=reports",
    };
  }

  return { ok: false, message: "Action not implemented" };
}
