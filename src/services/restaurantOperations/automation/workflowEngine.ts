/**
 * Workflow Engine — sole consumer of domain events.
 */

import { matchingRulesForEvent } from "./businessRules";
import { moveToDeadLetter } from "./deadLetterQueue";
import { requestApproval } from "./approvalEngine";
import { enqueueNotification } from "./notificationEngine";
import {
  getLatestVersion,
  getSettings,
  insertInstance,
  listDefinitions,
  listSteps,
  updateInstance,
} from "./repository";
import { createWorkflowTask } from "./taskEngine";
import { runWorkflowInstance } from "./workflowRunner";
import type { DomainEvent, WorkflowDefinition, WorkflowInstance } from "./types";

export async function dispatchDomainEvent(event: DomainEvent): Promise<{
  instances: WorkflowInstance[];
}> {
  const locationId = event.locationId ?? undefined;
  const settings = locationId ? await getSettings(locationId) : null;
  if (settings && !settings.enableAutomation) {
    return { instances: [] };
  }

  const rules = await matchingRulesForEvent(event);
  for (const rule of rules) {
    const action = rule.action;
    const type = String(action.type ?? "");
    if (type === "task") {
      await createWorkflowTask({
        locationId: event.locationId,
        title: String(action.title ?? rule.name),
        department: String(action.department ?? "manager"),
        priority: "high",
        metadata: { ruleCode: rule.code, eventId: event.id },
      });
    } else if (type === "approval") {
      await requestApproval({
        locationId: event.locationId,
        title: String(action.title ?? rule.name),
        stage: String(action.stage ?? "manager"),
      });
    } else if (type === "notify") {
      await enqueueNotification({
        locationId: event.locationId,
        channel: String(action.channel ?? "in_app"),
        templateKey: action.template ? String(action.template) : null,
        subject: String(action.subject ?? rule.name),
        vars: event.payload,
      });
    }
  }

  const defs = (await listDefinitions(locationId)).filter(
    (d) => d.active && d.triggerEvent === event.eventType,
  );

  const instances: WorkflowInstance[] = [];
  for (const def of defs) {
    const instance = await startWorkflow(def, event);
    if (instance) instances.push(instance);
  }
  return { instances };
}

export async function startWorkflow(
  definition: WorkflowDefinition,
  event: DomainEvent,
): Promise<WorkflowInstance | null> {
  const version = await getLatestVersion(definition.id);
  const instance = await insertInstance({
    definitionId: definition.id,
    versionId: version?.id ?? null,
    eventId: event.id,
    locationId: event.locationId,
    status: "running",
    context: {
      eventType: event.eventType,
      payload: event.payload,
      definitionCode: definition.code,
    },
  });
  if (!instance) return null;

  // Idempotency: if this instance already has steps, do not re-execute
  const existingSteps = await listSteps(instance.id);
  if (existingSteps.length > 0 || instance.status === "completed" || instance.status === "cancelled") {
    return instance;
  }

  const result = await runWorkflowInstance({ definition, instance, event });

  const settings = event.locationId ? await getSettings(event.locationId) : null;
  const maxRetries = settings?.maxRetries ?? 3;
  if (result.status === "failed" && result.retryCount >= maxRetries) {
    await moveToDeadLetter({
      instanceId: result.id,
      eventId: event.id,
      locationId: event.locationId,
      reason: result.error ?? "max retries exceeded",
      payload: { eventType: event.eventType, definitionCode: definition.code },
    });
  }
  return result;
}

export async function pauseWorkflow(instanceId: string): Promise<void> {
  await updateInstance(instanceId, { status: "paused" });
}

export async function resumeWorkflow(instanceId: string): Promise<void> {
  await updateInstance(instanceId, { status: "running" });
}

export async function cancelWorkflow(instanceId: string): Promise<void> {
  await updateInstance(instanceId, {
    status: "cancelled",
    completedAt: new Date().toISOString(),
  });
}

export async function retryWorkflow(instanceId: string): Promise<WorkflowInstance | null> {
  const { getInstance, getDefinition } = await import("./repository");
  const { listEvents } = await import("./repository");
  const inst = await getInstance(instanceId);
  if (!inst) return null;
  const def = await getDefinition(inst.definitionId);
  if (!def) return null;

  let event: DomainEvent | null = null;
  if (inst.eventId) {
    const events = await listEvents({ limit: 200 });
    event = events.find((e) => e.id === inst.eventId) ?? null;
  }
  if (!event) {
    event = {
      id: inst.eventId ?? instanceId,
      eventType: String(inst.context.eventType ?? def.triggerEvent),
      source: "system",
      entityType: null,
      entityId: null,
      locationId: inst.locationId,
      payload: (inst.context.payload as Record<string, unknown>) ?? {},
      version: 1,
      correlationId: null,
      idempotencyKey: null,
      status: "received",
      processedAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  await updateInstance(instanceId, {
    status: "retried",
    retryCount: inst.retryCount + 1,
    error: null,
    completedAt: null,
  });

  const refreshed = await getInstance(instanceId);
  if (!refreshed) return null;
  return runWorkflowInstance({ definition: def, instance: refreshed, event });
}
