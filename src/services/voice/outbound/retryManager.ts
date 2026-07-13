import { nowIso } from "../client";
import { enqueueRetry, getOutboundCall, updateOutboundCall, updateRetryStatus } from "./repository";
import { nextBusinessSlot } from "./complianceEngine";
import { getCompliance } from "./repository";
import type { OutboundCall, RetryPolicy } from "./types";

export async function scheduleRetry(input: {
  call: OutboundCall;
  policy: RetryPolicy;
  reason: string;
}): Promise<{ scheduled: boolean; at: string | null }> {
  if (input.call.attempt >= (input.policy.maxAttempts || input.call.maxAttempts)) {
    await updateOutboundCall(input.call.id, {
      status: "failed",
      outcome: "max_retries",
      endedAt: nowIso(),
    });
    return { scheduled: false, at: null };
  }

  const compliance = await getCompliance(input.call.locationId);
  let at = new Date(Date.now() + (input.policy.retryDelayMinutes || 60) * 60 * 1000);
  if (input.policy.respectBusinessHours && compliance) {
    at = nextBusinessSlot(compliance, at);
  }

  const nextAttempt = input.call.attempt + 1;
  await updateOutboundCall(input.call.id, {
    status: "queued",
    attempt: nextAttempt,
    scheduledFor: at.toISOString(),
    outcome: input.reason,
  });

  await enqueueRetry({
    outboundCallId: input.call.id,
    locationId: input.call.locationId,
    attempt: nextAttempt,
    scheduledFor: at.toISOString(),
    reason: input.reason,
  });

  return { scheduled: true, at: at.toISOString() };
}

export async function processDueRetries(
  processFn: (callId: string) => Promise<void>,
): Promise<number> {
  const { listDueRetries } = await import("./repository");
  const due = await listDueRetries();
  let n = 0;
  for (const row of due) {
    const id = String((row as { id: string }).id);
    const callId = String((row as { outbound_call_id: string }).outbound_call_id);
    await updateRetryStatus(id, "processing");
    const call = await getOutboundCall(callId);
    if (!call) {
      await updateRetryStatus(id, "skipped");
      continue;
    }
    await processFn(callId);
    await updateRetryStatus(id, "done");
    n += 1;
  }
  return n;
}
