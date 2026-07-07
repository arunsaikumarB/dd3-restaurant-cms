type LogMeta = {
  conversationId?: string;
  provider: string;
  model: string;
  latencyMs: number;
  stream: boolean;
  tokenUsage?: { input?: number; output?: number };
  error?: string;
};

/** Server-only structured logs — never log API keys, prompts, or PII. */
export function logConciergeEvent(meta: LogMeta): void {
  console.log(
    JSON.stringify({
      event: "cheffy_ai",
      timestamp: new Date().toISOString(),
      conversationId: meta.conversationId ?? "anonymous",
      provider: meta.provider,
      model: meta.model,
      latencyMs: meta.latencyMs,
      stream: meta.stream,
      tokenUsage: meta.tokenUsage ?? null,
      error: meta.error ?? null,
    }),
  );
}
