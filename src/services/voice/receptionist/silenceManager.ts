import { getSilenceRules } from "./repository";
import { getOrCreateMemory } from "./conversationManager";
import type { SilencePrompt, SilenceStage } from "./types";

export async function evaluateSilence(
  sessionId: string,
  locationId: string,
  language: string,
  silenceMs: number,
): Promise<SilencePrompt> {
  const rules = await getSilenceRules(locationId);
  const soft = rules?.softPromptMs ?? 5000;
  const hold = rules?.holdPromptMs ?? 10000;
  const end = rules?.endAfterMs ?? 20000;
  const mem = getOrCreateMemory(sessionId, locationId, language);

  let stage: SilenceStage = "none";
  let text = "";
  let shouldEndCall = false;

  if (silenceMs >= end) {
    stage = "end";
    text = rules?.prompt20s ?? "I'll go ahead and end the call for now. Feel free to call us back anytime. Take care!";
    shouldEndCall = true;
  } else if (silenceMs >= hold) {
    stage = "hold";
    text = rules?.prompt10s ?? "I'll stay on the line if you need a moment.";
  } else if (silenceMs >= soft) {
    stage = "soft";
    text = rules?.prompt5s ?? "Are you still there?";
  }

  if (stage !== "none") {
    mem.silencePrompts += 1;
  }

  return { stage, text, shouldEndCall };
}
