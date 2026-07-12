import { listInstances, listSteps, getInstance } from "./repository";
import type { WorkflowInstance, WorkflowStep } from "./types";

export async function getExecutionHistory(opts: {
  locationId?: string;
  status?: string;
  limit?: number;
}): Promise<WorkflowInstance[]> {
  return listInstances(opts);
}

export async function getInstanceHistory(instanceId: string): Promise<{
  instance: WorkflowInstance | null;
  steps: WorkflowStep[];
}> {
  const instance = await getInstance(instanceId);
  const steps = await listSteps(instanceId);
  return { instance, steps };
}
