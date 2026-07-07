import type { UserRole } from "../../types/database";
import type { AIAccessLevel } from "../../types/aiAdmin";

export type AIConciergePermissions = {
  level: AIAccessLevel;
  readOnly: boolean;
  canEditGeneral: boolean;
  canEditPersonality: boolean;
  canEditKnowledge: boolean;
  canEditProvider: boolean;
  canEditPrompt: boolean;
  canEditSuggestions: boolean;
  canEditConversation: boolean;
  canEditAdvanced: boolean;
  canRunSandbox: boolean;
  canExportLogs: boolean;
  canRetryErrors: boolean;
};

export function resolveAIAccessLevel(
  role: UserRole,
  aiAccessLevel?: string | null,
): AIAccessLevel {
  if (aiAccessLevel === "super_admin" || aiAccessLevel === "manager" || aiAccessLevel === "staff") {
    return aiAccessLevel;
  }
  return role === "admin" ? "super_admin" : "staff";
}

export function getAIConciergePermissions(
  role: UserRole,
  aiAccessLevel?: string | null,
): AIConciergePermissions {
  const level = resolveAIAccessLevel(role, aiAccessLevel);
  const readOnly = level === "staff";
  const managerOrAbove = level === "super_admin" || level === "manager";

  return {
    level,
    readOnly,
    canEditGeneral: managerOrAbove,
    canEditPersonality: managerOrAbove,
    canEditKnowledge: managerOrAbove,
    canEditProvider: level === "super_admin",
    canEditPrompt: managerOrAbove,
    canEditSuggestions: managerOrAbove,
    canEditConversation: managerOrAbove,
    canEditAdvanced: level === "super_admin",
    canRunSandbox: managerOrAbove,
    canExportLogs: true,
    canRetryErrors: level === "super_admin",
  };
}
