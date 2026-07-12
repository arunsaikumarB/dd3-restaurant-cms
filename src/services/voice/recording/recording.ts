import {
  getSession,
  insertRecording,
  listRecordings,
  listTranscripts,
  getVoiceSettings,
} from "../repository";
import type { VoiceRecording, VoiceTranscript } from "../types";

export async function maybeStartRecording(sessionId: string): Promise<VoiceRecording | null> {
  const session = await getSession(sessionId);
  if (!session) return null;
  const settings = await getVoiceSettings(session.locationId);
  if (!settings?.recordingEnabled) return null;

  const expires = new Date();
  expires.setDate(expires.getDate() + (settings.recordingRetentionDays || 30));

  return insertRecording({
    sessionId,
    locationId: session.locationId,
    disclaimerShown: true,
    expiresAt: expires.toISOString(),
    format: "webm",
  });
}

export async function getSessionTranscriptBundle(sessionId: string): Promise<{
  transcripts: VoiceTranscript[];
  downloadText: string;
}> {
  const transcripts = await listTranscripts(sessionId);
  const downloadText = transcripts
    .map((t) => `[${t.role}] ${t.text}`)
    .join("\n");
  return { transcripts, downloadText };
}

export async function getRecordingsForLocation(locationId: string) {
  return listRecordings(locationId);
}
