import { insertEvent as repoInsertEvent } from "../repository";
import { setCallState } from "../gateway/gateway";
import type { CallState } from "../types";

export async function insertEvent(
  sessionId: string,
  eventType: string,
  payload: Record<string, unknown> = {},
) {
  return repoInsertEvent(sessionId, eventType, payload);
}

export async function setCallStateSafe(sessionId: string, callState: CallState) {
  try {
    await setCallState(sessionId, callState);
  } catch {
    /* session may have ended */
  }
}
