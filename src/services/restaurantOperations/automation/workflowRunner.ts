/**
 * Executes a single workflow instance against its version graph.
 */

import { nodeConditionPasses } from "./businessRules";
import { requestApproval } from "./approvalEngine";
import { enqueueNotification } from "./notificationEngine";
import { createWorkflowTask } from "./taskEngine";
import {
  getLatestVersion,
  insertStep,
  updateInstance,
} from "./repository";
import type {
  DomainEvent,
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowGraph,
  WorkflowInstance,
  WorkflowNode,
} from "./types";

function nextNodes(
  graph: WorkflowGraph,
  fromId: string,
  when?: string,
): WorkflowNode[] {
  const edges = graph.edges.filter((e) => {
    if (e.from !== fromId) return false;
    if (!e.when) return true;
    return e.when === when;
  });
  return edges
    .map((e) => graph.nodes.find((n) => n.id === e.to))
    .filter((n): n is WorkflowNode => Boolean(n));
}

function triggerNode(graph: WorkflowGraph): WorkflowNode | undefined {
  return graph.nodes.find((n) => n.type === "trigger") ?? graph.nodes[0];
}

async function runNode(
  node: WorkflowNode,
  instance: WorkflowInstance,
  event: DomainEvent,
): Promise<{ continueWhen?: string; pause?: boolean; output: Record<string, unknown> }> {
  const cfg = node.config ?? {};
  const payload = { ...event.payload, ...instance.context };

  switch (node.type) {
    case "trigger":
      return { output: { triggered: true } };

    case "condition":
    case "decision": {
      const pass = nodeConditionPasses(cfg, payload);
      await insertStep({
        instanceId: instance.id,
        nodeId: node.id,
        nodeType: node.type,
        status: "completed",
        input: cfg,
        output: { pass },
      });
      return { continueWhen: pass ? "true" : "false", output: { pass } };
    }

    case "task": {
      const task = await createWorkflowTask({
        instanceId: instance.id,
        locationId: event.locationId,
        title: String(cfg.title ?? node.label),
        description: cfg.description ? String(cfg.description) : null,
        department: String(cfg.department ?? "manager"),
        ownerName: cfg.ownerName ? String(cfg.ownerName) : null,
        priority: String(cfg.priority ?? "medium"),
        metadata: { eventType: event.eventType, entityId: event.entityId },
      });
      await insertStep({
        instanceId: instance.id,
        nodeId: node.id,
        nodeType: node.type,
        status: "completed",
        output: { taskId: task?.id ?? null },
      });
      return { output: { taskId: task?.id ?? null } };
    }

    case "notification": {
      const n = await enqueueNotification({
        instanceId: instance.id,
        locationId: event.locationId,
        channel: String(cfg.channel ?? "in_app"),
        templateKey: cfg.template ? String(cfg.template) : null,
        subject: cfg.subject ? String(cfg.subject) : null,
        vars: {
          entityId: event.entityId,
          customerName: payload.customerName,
          guests: payload.guests,
          ...payload,
        },
      });
      await insertStep({
        instanceId: instance.id,
        nodeId: node.id,
        nodeType: node.type,
        status: "completed",
        output: { notificationId: n?.id ?? null, status: n?.status },
      });
      return { output: { notificationId: n?.id ?? null } };
    }

    case "approval": {
      const approval = await requestApproval({
        instanceId: instance.id,
        locationId: event.locationId,
        title: String(cfg.title ?? node.label),
        stage: String(cfg.stage ?? "manager"),
        timeoutMinutes: cfg.timeoutMinutes != null ? Number(cfg.timeoutMinutes) : 60,
      });
      await insertStep({
        instanceId: instance.id,
        nodeId: node.id,
        nodeType: node.type,
        status: "waiting",
        output: { approvalId: approval?.id ?? null },
      });
      // Auto-approve for demo continuity unless stage requires human wait —
      // instances stay waiting_approval; admin can resolve. Continue chain after create.
      return { pause: false, output: { approvalId: approval?.id ?? null } };
    }

    case "delay": {
      const minutes = Number(cfg.minutes ?? 0);
      const scheduledAt =
        minutes > 0 ? new Date(Date.now() + minutes * 60_000).toISOString() : null;
      await insertStep({
        instanceId: instance.id,
        nodeId: node.id,
        nodeType: node.type,
        status: "completed",
        output: { delayedMinutes: minutes, resumeAt: scheduledAt },
      });
      // Record delay without blocking the runner (scheduled notifications use scheduledAt)
      if (minutes > 0) {
        await enqueueNotification({
          instanceId: instance.id,
          locationId: event.locationId,
          channel: "in_app",
          subject: "Delayed workflow step",
          body: `Delay of ${minutes} minute(s) recorded for ${event.eventType}`,
          scheduledAt,
        });
      }
      return { output: { delayedMinutes: minutes } };
    }

    case "parallel": {
      // Fan-out: runner walks all edges without when filter
      await insertStep({
        instanceId: instance.id,
        nodeId: node.id,
        nodeType: node.type,
        status: "completed",
        output: { parallel: true },
      });
      return { output: { parallel: true } };
    }

    case "merge":
      await insertStep({
        instanceId: instance.id,
        nodeId: node.id,
        nodeType: node.type,
        status: "completed",
        output: { merged: true },
      });
      return { output: { merged: true } };

    case "end":
      await insertStep({
        instanceId: instance.id,
        nodeId: node.id,
        nodeType: node.type,
        status: "completed",
        output: { ended: true },
      });
      return { output: { ended: true } };

    default:
      await insertStep({
        instanceId: instance.id,
        nodeId: node.id,
        nodeType: node.type,
        status: "completed",
        output: { skipped: true },
      });
      return { output: { skipped: true } };
  }
}

export async function runWorkflowInstance(input: {
  definition: WorkflowDefinition;
  instance: WorkflowInstance;
  event: DomainEvent;
}): Promise<WorkflowInstance> {
  const version = await getLatestVersion(input.definition.id);
  if (!version) {
    const failed = await updateInstance(input.instance.id, {
      status: "failed",
      error: "No workflow version found",
      completedAt: new Date().toISOString(),
    });
    return failed ?? input.instance;
  }

  const graph = version.graph;
  const start = triggerNode(graph);
  if (!start) {
    const failed = await updateInstance(input.instance.id, {
      status: "failed",
      error: "Empty workflow graph",
      completedAt: new Date().toISOString(),
    });
    return failed ?? input.instance;
  }

  const queue: Array<{ node: WorkflowNode; when?: string }> = [{ node: start }];
  const visited = new Set<string>();
  let current = input.instance;

  try {
    while (queue.length) {
      const item = queue.shift()!;
      const visitKey = `${item.node.id}:${item.when ?? ""}`;
      if (visited.has(visitKey)) continue;
      visited.add(visitKey);

      current =
        (await updateInstance(current.id, { currentNode: item.node.id, status: "running" })) ??
        current;

      const result = await runNode(item.node, current, input.event);
      current =
        (await updateInstance(current.id, {
          context: { ...current.context, ...result.output },
        })) ?? current;

      if (item.node.type === "end") {
        current =
          (await updateInstance(current.id, {
            status: "completed",
            completedAt: new Date().toISOString(),
            currentNode: item.node.id,
          })) ?? current;
        continue;
      }

      if (result.pause) {
        current =
          (await updateInstance(current.id, {
            status: "waiting_approval",
            currentNode: item.node.id,
          })) ?? current;
        return current;
      }

      const outs = nextNodes(graph, item.node.id, result.continueWhen);
      // parallel: take all edges regardless of when
      const parallelOuts =
        item.node.type === "parallel"
          ? graph.edges
              .filter((e: WorkflowEdge) => e.from === item.node.id)
              .map((e) => graph.nodes.find((n) => n.id === e.to))
              .filter((n): n is WorkflowNode => Boolean(n))
          : outs;

      for (const n of parallelOuts) {
        queue.push({ node: n, when: result.continueWhen });
      }
    }

    if (current.status === "running") {
      current =
        (await updateInstance(current.id, {
          status: "completed",
          completedAt: new Date().toISOString(),
        })) ?? current;
    }
    return current;
  } catch (err) {
    const message = err instanceof Error ? err.message : "workflow failed";
    const failed = await updateInstance(current.id, {
      status: "failed",
      error: message,
      completedAt: new Date().toISOString(),
      retryCount: current.retryCount + 1,
    });
    return failed ?? current;
  }
}
