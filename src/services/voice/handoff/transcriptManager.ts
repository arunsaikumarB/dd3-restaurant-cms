import { listTranscripts } from "../repository";

export type TranscriptLine = {
  id: string;
  role: "customer" | "ai" | "staff" | "system";
  text: string;
  at: string;
  confidence: number | null;
};

export async function getLiveTranscript(sessionId: string): Promise<TranscriptLine[]> {
  const rows = await listTranscripts(sessionId);
  return rows.map((t) => ({
    id: t.id,
    role:
      t.role === "user"
        ? "customer"
        : t.role === "assistant"
          ? "ai"
          : t.role === "system"
            ? "system"
            : "staff",
    text: t.text,
    at: t.createdAt,
    confidence: t.confidence,
  }));
}

export function searchTranscript(lines: TranscriptLine[], query: string): TranscriptLine[] {
  const q = query.trim().toLowerCase();
  if (!q) return lines;
  return lines.filter((l) => l.text.toLowerCase().includes(q));
}

export function transcriptToText(lines: TranscriptLine[]): string {
  return lines
    .map((l) => `[${l.at.slice(11, 19)}] ${l.role.toUpperCase()}: ${l.text}`)
    .join("\n");
}

export function downloadTranscriptFilename(sessionId: string): string {
  return `voice-transcript-${sessionId.slice(0, 8)}.txt`;
}
