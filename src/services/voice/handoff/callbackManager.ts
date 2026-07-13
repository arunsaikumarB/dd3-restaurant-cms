import { insertCallback, insertCallTask, updateCallbackStatus } from "./repository";
import type { CallbackQueueItem, TaskType, TransferContextPayload, WrapUpResult } from "./types";

export async function enqueueCallback(input: {
  locationId: string;
  sessionId?: string | null;
  escalationId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  reason?: string | null;
  departmentCode?: string;
  priority?: number;
  scheduledFor?: string | null;
  notes?: string | null;
}): Promise<CallbackQueueItem | null> {
  return insertCallback(input);
}

export async function markCallbackDone(id: string): Promise<void> {
  await updateCallbackStatus(id, "completed");
}

export async function createTasksFromWrapUp(input: {
  locationId: string;
  sessionId: string;
  escalationId: string;
  transferId: string;
  wrapUp: WrapUpResult;
  context: TransferContextPayload;
}): Promise<void> {
  for (const taskType of input.wrapUp.suggestedTasks) {
    await insertCallTask({
      sessionId: input.sessionId,
      locationId: input.locationId,
      escalationId: input.escalationId,
      transferId: input.transferId,
      taskType,
      title: taskTitle(taskType, input.context),
      description: input.wrapUp.summary,
      priority: taskType === "complaint_ticket" || taskType === "refund_review" ? 2 : 5,
    });
  }
}

function taskTitle(type: TaskType, ctx: TransferContextPayload): string {
  const name = ctx.customerName ?? "Guest";
  switch (type) {
    case "callback":
      return `Callback · ${name}`;
    case "follow_up":
      return `Follow-up · ${name}`;
    case "manager_review":
      return `Manager review · ${name}`;
    case "refund_review":
      return `Refund review · ${name}`;
    case "complaint_ticket":
      return `Complaint ticket · ${name}`;
    case "vip_follow_up":
      return `VIP follow-up · ${name}`;
    case "reservation_confirmation":
      return `Confirm reservation · ${name}`;
    default:
      return `Task · ${name}`;
  }
}
