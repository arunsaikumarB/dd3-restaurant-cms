/**
 * Task engine — create / complete workflow tasks from automation nodes.
 */

import { insertTask, listTasks, updateTaskStatus } from "./repository";
import type { WorkflowTask } from "./types";

export async function createWorkflowTask(input: {
  instanceId?: string | null;
  locationId?: string | null;
  title: string;
  description?: string | null;
  department?: string;
  ownerName?: string | null;
  priority?: string;
  dueAt?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<WorkflowTask | null> {
  return insertTask(input);
}

export async function getWorkflowTasks(opts: {
  locationId?: string;
  status?: string;
}): Promise<WorkflowTask[]> {
  return listTasks(opts);
}

export async function completeWorkflowTask(id: string): Promise<WorkflowTask | null> {
  return updateTaskStatus(id, "done");
}

export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    vars[key] != null ? String(vars[key]) : "",
  );
}
