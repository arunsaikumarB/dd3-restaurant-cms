/**
 * Routes transfers to available staff by department + role authorization.
 */

import { listLiveAgents } from "./repository";
import type { HandoffStaffRole, VoiceLiveAgent } from "./types";

const DEPT_ROLES: Record<string, HandoffStaffRole[]> = {
  manager: ["super_admin", "manager"],
  host: ["super_admin", "manager", "host", "staff"],
  reservations: ["super_admin", "manager", "reservations", "host"],
  catering: ["super_admin", "manager", "catering", "events"],
  events: ["super_admin", "manager", "events", "catering"],
  support: ["super_admin", "manager", "support"],
  general: ["super_admin", "manager", "host", "reservations", "support", "staff", "catering", "events"],
};

export function canAcceptTransfer(agent: VoiceLiveAgent, departmentCode: string): boolean {
  if (agent.status !== "available") return false;
  if (agent.activeCalls >= agent.maxConcurrent) return false;
  const allowed = DEPT_ROLES[departmentCode] ?? DEPT_ROLES.general;
  if (!allowed.includes(agent.role) && agent.role !== "super_admin") return false;
  if (agent.departmentCode === departmentCode) return true;
  if (agent.role === "super_admin" || agent.role === "manager") return true;
  return agent.departmentCode === "general";
}

export async function findBestAgent(
  locationId: string,
  departmentCode: string,
): Promise<VoiceLiveAgent | null> {
  const agents = await listLiveAgents(locationId);
  const eligible = agents
    .filter((a) => canAcceptTransfer(a, departmentCode))
    .sort((a, b) => a.activeCalls - b.activeCalls || a.displayName.localeCompare(b.displayName));
  return eligible[0] ?? null;
}

export async function listAvailableAgents(
  locationId: string,
  departmentCode?: string,
): Promise<VoiceLiveAgent[]> {
  const agents = await listLiveAgents(locationId);
  return agents.filter((a) =>
    departmentCode ? canAcceptTransfer(a, departmentCode) : a.status === "available",
  );
}

export function warmTransferIntro(staffName: string, departmentCode: string): string {
  const dept =
    departmentCode === "manager"
      ? "our manager"
      : departmentCode === "reservations"
        ? "our reservations team"
        : departmentCode === "catering"
          ? "our catering specialist"
          : departmentCode === "events"
            ? "our events specialist"
            : "a team member";
  return `I'm connecting you with ${staffName} from ${dept}. I've shared your details so you won't need to repeat yourself.`;
}

export function coldTransferHold(): string {
  return "Please hold for a moment while I connect you with a team member.";
}

export function unavailableStaffMessage(): string {
  return "Our team is assisting other guests right now. I can keep helping, or add you to a callback queue so someone reaches out shortly. Which would you prefer?";
}
