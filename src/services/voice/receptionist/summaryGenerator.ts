import { listEvents, listTranscripts, getSession } from "../repository";
import { getOrCreateMemory, clearMemory } from "./conversationManager";
import { insertCallSummary, upsertConversationMetrics } from "./repository";
import type { CallSummary } from "./types";

function sentimentFromText(blob: string): string {
  const t = blob.toLowerCase();
  if (/\b(angry|upset|terrible|worst|complaint|refund)\b/.test(t)) return "negative";
  if (/\b(thank|great|love|wonderful|amazing|perfect)\b/.test(t)) return "positive";
  return "neutral";
}

function topicsFromTranscripts(texts: string[]): string[] {
  const topics = new Set<string>();
  for (const raw of texts) {
    const t = raw.toLowerCase();
    if (/\bhour|open|close\b/.test(t)) topics.add("hours");
    if (/\bmenu|dish|food|biryani\b/.test(t)) topics.add("menu");
    if (/\boffer|special\b/.test(t)) topics.add("offers");
    if (/\bpark\b/.test(t)) topics.add("parking");
    if (/\bdirection|address|location\b/.test(t)) topics.add("directions");
    if (/\breserv|book\b/.test(t)) topics.add("reservations");
    if (/\bcater\b/.test(t)) topics.add("catering");
    if (/\bparty|event\b/.test(t)) topics.add("events");
  }
  return [...topics];
}

export async function generateCallSummary(sessionId: string): Promise<CallSummary | null> {
  const session = await getSession(sessionId);
  if (!session) return null;
  const [transcripts, events] = await Promise.all([listTranscripts(sessionId), listEvents(sessionId, 200)]);
  const mem = getOrCreateMemory(sessionId, session.locationId, session.language);

  const userLines = transcripts.filter((t) => t.role === "user").map((t) => t.text);
  const assistantLines = transcripts.filter((t) => t.role === "assistant").map((t) => t.text);
  const topics = topicsFromTranscripts([...userLines, ...assistantLines]);
  const intents = [...new Set([...mem.detectedIntents, ...(session.currentIntent ? [session.currentIntent] : [])])];
  const knowledgeUsed = events
    .filter((e) => e.eventType === "assistant_reply" || e.eventType.includes("rag"))
    .slice(0, 8)
    .map((e) => e.eventType);

  const durationMs = session.durationMs || Date.now() - new Date(session.startedAt).getTime();
  const summaryParts = [
    `Call at ${session.locationId} via ${session.channel}.`,
    userLines.length ? `Guest asked about: ${topics.join(", ") || "general information"}.` : "Short call with limited guest speech.",
    intents.length ? `Intents: ${intents.join(", ")}.` : "",
    mem.customerName ? `Guest name: ${mem.customerName}.` : "",
    session.plannerGoal ? `Planner goal: ${session.plannerGoal}.` : "",
  ].filter(Boolean);

  const blob = [...userLines, ...assistantLines].join(" ");
  const sentiment = sentimentFromText(blob);
  const escalation =
    sentiment === "negative" || intents.includes("speak_to_manager") || intents.includes("contact_staff")
      ? "Recommend staff follow-up"
      : intents.includes("reservation_inquiry")
        ? "Hand off to Voice Reservation Agent (Phase 3)"
        : null;

  const saved = await insertCallSummary({
    sessionId,
    locationId: session.locationId,
    summary: summaryParts.join(" "),
    topics,
    detectedIntents: intents,
    knowledgeUsed,
    plannerGoal: session.plannerGoal,
    durationMs,
    language: session.language,
    sentiment,
    escalationRecommendation: escalation,
  });

  await upsertConversationMetrics({
    sessionId,
    locationId: session.locationId,
    turns: mem.turns,
    interruptions: mem.interruptions,
    silencePrompts: mem.silencePrompts,
    misunderstandings: mem.misunderstandings,
    languageSwitches: mem.languageSwitches,
    repeatRequests: mem.repeatRequests,
  });

  clearMemory(sessionId);
  return saved;
}
