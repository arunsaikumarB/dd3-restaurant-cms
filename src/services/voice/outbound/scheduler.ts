import { nowIso } from "../client";
import {
  insertSchedulerJob,
  listDueSchedulerJobs,
  listSchedulerJobs,
  updateSchedulerJob,
} from "./repository";
import { nextBusinessSlot } from "./complianceEngine";
import { getCompliance } from "./repository";

export async function scheduleJob(input: {
  locationId: string;
  jobType: "campaign_run" | "outbound_dial" | "retry" | "trigger_scan";
  refId?: string | null;
  runAt?: string | null;
  immediate?: boolean;
  payload?: Record<string, unknown>;
}): Promise<{ runAt: string }> {
  let runAt = input.runAt ?? nowIso();
  if (!input.immediate && !input.runAt) {
    const compliance = await getCompliance(input.locationId);
    if (compliance) runAt = nextBusinessSlot(compliance).toISOString();
  }
  await insertSchedulerJob({
    locationId: input.locationId,
    jobType: input.jobType,
    refId: input.refId,
    runAt,
    payload: input.payload,
  });
  return { runAt };
}

export async function processDueJobs(
  handlers: Partial<
    Record<
      string,
      (job: { id: string; ref_id?: string | null; payload?: Record<string, unknown>; location_id: string }) => Promise<void>
    >
  >,
): Promise<number> {
  const due = await listDueSchedulerJobs();
  let n = 0;
  for (const raw of due) {
    const job = raw as {
      id: string;
      job_type: string;
      ref_id?: string | null;
      payload?: Record<string, unknown>;
      location_id: string;
    };
    await updateSchedulerJob(job.id, "running");
    try {
      const handler = handlers[job.job_type];
      if (handler) await handler(job);
      await updateSchedulerJob(job.id, "done");
      n += 1;
    } catch (e) {
      await updateSchedulerJob(job.id, "failed", e instanceof Error ? e.message : "job failed");
    }
  }
  return n;
}

export async function listJobs(locationId: string) {
  return listSchedulerJobs(locationId);
}
