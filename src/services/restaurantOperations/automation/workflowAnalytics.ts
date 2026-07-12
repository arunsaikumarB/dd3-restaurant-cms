import {
  listApprovals,
  listDeadLetters,
  listDefinitions,
  listInstances,
  listNotifications,
  listTasks,
} from "./repository";
import type { WorkflowAnalyticsSnapshot } from "./types";

export async function getWorkflowAnalytics(locationId?: string): Promise<WorkflowAnalyticsSnapshot> {
  const [instances, tasks, approvals, notifications, dead, defs] = await Promise.all([
    listInstances({ locationId, limit: 500 }),
    listTasks({ locationId, limit: 500 }),
    listApprovals({ locationId }),
    listNotifications({ locationId }),
    listDeadLetters({ locationId }),
    listDefinitions(locationId),
  ]);

  const executions = instances.length;
  const completed = instances.filter((i) => i.status === "completed").length;
  const failed = instances.filter((i) => i.status === "failed").length;
  const successRate = executions ? Math.round((completed / executions) * 1000) / 10 : 0;
  const failureRate = executions ? Math.round((failed / executions) * 1000) / 10 : 0;

  const durations = instances
    .filter((i) => i.completedAt)
    .map((i) => (new Date(i.completedAt!).getTime() - new Date(i.startedAt).getTime()) / 1000);
  const avgDurationSeconds = durations.length
    ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
    : 0;

  const retries = instances.reduce((s, i) => s + i.retryCount, 0);
  const pendingTasks = tasks.filter((t) => t.status === "open").length;
  const pendingApprovals = approvals.filter((a) => a.status === "pending").length;

  const sent = notifications.filter((n) => n.status === "sent").length;
  const notificationSuccessRate = notifications.length
    ? Math.round((sent / notifications.length) * 1000) / 10
    : 0;

  const counts = new Map<string, number>();
  for (const i of instances) {
    counts.set(i.definitionId, (counts.get(i.definitionId) ?? 0) + 1);
  }
  const mostUsed = defs
    .map((d) => ({ code: d.code, name: d.name, count: counts.get(d.id) ?? 0 }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const dept = new Map<string, number>();
  for (const t of tasks) {
    dept.set(t.department, (dept.get(t.department) ?? 0) + 1);
  }
  const departmentWorkload = [...dept.entries()].map(([department, count]) => ({
    department,
    count,
  }));

  return {
    executions,
    successRate,
    failureRate,
    avgDurationSeconds,
    retries,
    pendingTasks,
    pendingApprovals,
    notificationSuccessRate,
    mostUsed,
    deadLetters: dead.filter((d) => d.status === "open").length,
    departmentWorkload,
  };
}
