import { stopTtsForSession } from "../gateway/pipeline";
import { insertEvent } from "../repository";
import { getOrCreateMemory } from "./conversationManager";

/** Customer interrupts AI — stop TTS immediately and resume listening. */
export async function handleInterruption(sessionId: string, locationId: string, language: string): Promise<void> {
  const mem = getOrCreateMemory(sessionId, locationId, language);
  mem.interruptions += 1;
  await stopTtsForSession(sessionId);
  await insertEvent(sessionId, "receptionist_interrupted", {
    interruptions: mem.interruptions,
  });
}
