import type { Context } from "@netlify/functions";
import { readServerAIConfig, resolveRequestModel } from "./lib/aiConfig";
import { logConciergeEvent } from "./lib/aiLogger";
import { buildCheffySystemPrompt } from "./lib/cheffySystemPrompt";

type ChatTurn = { role: "user" | "assistant"; content: string };

type ToolResult = { tool: string; available: boolean; data: unknown };

type SessionContext = {
  locationId?: string;
  locationName?: string;
  preferences?: Record<string, unknown>;
};

type RequestBody = {
  provider?: string;
  message?: string;
  history?: ChatTurn[];
  cmsContext?: {
    intent?: string;
    modules?: string[];
    context?: Record<string, unknown>;
  };
  toolResults?: ToolResult[];
  session?: SessionContext;
  conversationId?: string;
  model?: string;
  stream?: boolean;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const sse = (body: ReadableStream<Uint8Array>) =>
  new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });

function encodeSse(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

function resolveProvider(body: RequestBody, config: ReturnType<typeof readServerAIConfig>): string {
  return (body.provider ?? config.provider ?? "gemini").toLowerCase();
}

function buildPrompt(body: RequestBody): string {
  return buildCheffySystemPrompt({
    intent: body.cmsContext?.intent,
    modules: body.cmsContext?.modules,
    context: body.cmsContext?.context,
    toolResults: body.toolResults,
    session: body.session,
  });
}

function buildGeminiContents(history: ChatTurn[], message: string) {
  const turns = history
    .filter((t) => t.role === "user" || t.role === "assistant")
    .slice(-12)
    .map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content }],
    }));

  return [...turns, { role: "user", parts: [{ text: message }] }];
}

async function callGemini(
  apiKey: string,
  model: string,
  system: string,
  history: ChatTurn[],
  message: string,
  stream: boolean,
  generation: { temperature: number; topP: number; maxOutputTokens: number },
): Promise<Response> {
  const url = stream
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: buildGeminiContents(history, message),
      generationConfig: {
        temperature: generation.temperature,
        topP: generation.topP,
        maxOutputTokens: generation.maxOutputTokens,
      },
    }),
  });
}

function pipeGeminiStream(upstream: Response): ReadableStream<Uint8Array> {
  const reader = upstream.body!.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      let accumulated = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (!payload) continue;

            let parsed: {
              candidates?: { content?: { parts?: { text?: string }[] } }[];
              usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
            };
            try {
              parsed = JSON.parse(payload);
            } catch {
              continue;
            }

            const delta = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            if (delta) {
              accumulated += delta;
              controller.enqueue(
                encodeSse({ type: "delta", delta, content: accumulated }),
              );
            }
          }
        }

        controller.enqueue(
          encodeSse({ type: "done", content: accumulated, done: true }),
        );
      } catch {
        controller.enqueue(encodeSse({ type: "error", error: "stream_failed" }));
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });
}

async function handleGemini(body: RequestBody, message: string, stream: boolean) {
  const started = Date.now();
  const config = readServerAIConfig();
  const apiKey = process.env.GEMINI_API_KEY;
  const model = resolveRequestModel(body.model, config, "gemini");

  if (!apiKey) {
    logConciergeEvent({
      conversationId: body.conversationId,
      provider: "gemini",
      model,
      latencyMs: Date.now() - started,
      stream,
      error: "provider_not_configured",
    });
    return json(
      { error: "AI service unavailable", code: "provider_not_configured" },
      503,
    );
  }

  const system = buildPrompt(body);
  const upstream = await callGemini(
    apiKey,
    model,
    system,
    body.history ?? [],
    message,
    stream,
    config.gemini,
  );

  if (!upstream.ok) {
    let detail = "Gemini upstream error";
    try {
      const errBody = (await upstream.json()) as { error?: { message?: string } };
      detail = errBody.error?.message ?? detail;
    } catch {
      /* ignore */
    }
    logConciergeEvent({
      conversationId: body.conversationId,
      provider: "gemini",
      model,
      latencyMs: Date.now() - started,
      stream,
      error: detail,
    });
    return json({ error: "AI service unavailable", code: "upstream_error" }, 502);
  }

  if (stream) {
    if (!upstream.body) {
      return json({ error: "No stream from Gemini", code: "no_stream" }, 502);
    }
    logConciergeEvent({
      conversationId: body.conversationId,
      provider: "gemini",
      model,
      latencyMs: Date.now() - started,
      stream: true,
    });
    return sse(pipeGeminiStream(upstream));
  }

  const data = (await upstream.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };

  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();

  logConciergeEvent({
    conversationId: body.conversationId,
    provider: "gemini",
    model,
    latencyMs: Date.now() - started,
    stream: false,
    tokenUsage: {
      input: data.usageMetadata?.promptTokenCount,
      output: data.usageMetadata?.candidatesTokenCount,
    },
  });

  if (!text) return json({ error: "Empty completion", code: "empty_response" }, 502);
  return json({ content: text });
}

function buildMessages(history: ChatTurn[], message: string) {
  return [
    ...history
      .filter((turn) => turn.role === "user" || turn.role === "assistant")
      .slice(-12)
      .map((turn) => ({
        role: turn.role as "user" | "assistant",
        content: turn.content,
      })),
    { role: "user" as const, content: message },
  ];
}

async function callClaude(
  apiKey: string,
  model: string,
  system: string,
  messages: ReturnType<typeof buildMessages>,
  stream: boolean,
): Promise<Response> {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      temperature: 0.4,
      stream,
      system,
      messages,
    }),
  });
}

function pipeClaudeStream(upstream: Response): ReadableStream<Uint8Array> {
  const reader = upstream.body!.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      let accumulated = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const rawEvent of events) {
            const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data: "));
            if (!dataLine) continue;

            const payload = dataLine.slice(6).trim();
            if (!payload || payload === "[DONE]") continue;

            let parsed: {
              type?: string;
              delta?: { type?: string; text?: string };
            };
            try {
              parsed = JSON.parse(payload);
            } catch {
              continue;
            }

            if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
              const delta = parsed.delta.text ?? "";
              if (!delta) continue;
              accumulated += delta;
              controller.enqueue(
                encodeSse({ type: "delta", delta, content: accumulated }),
              );
            }

            if (parsed.type === "message_stop") {
              controller.enqueue(
                encodeSse({ type: "done", content: accumulated, done: true }),
              );
            }
          }
        }

        if (accumulated) {
          controller.enqueue(
            encodeSse({ type: "done", content: accumulated, done: true }),
          );
        }
      } catch {
        controller.enqueue(encodeSse({ type: "error", error: "stream_failed" }));
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });
}

async function callOpenAI(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  history: ChatTurn[],
  message: string,
  stream: boolean,
): Promise<Response> {
  const messages = [
    { role: "system", content: system },
    ...history
      .filter((turn) => turn.role === "user" || turn.role === "assistant")
      .slice(-12),
    { role: "user", content: message },
  ];

  return fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 1024,
      stream,
    }),
  });
}

function pipeOpenAIStream(upstream: Response): ReadableStream<Uint8Array> {
  const reader = upstream.body!.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      let accumulated = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const rawEvent of events) {
            const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data: "));
            if (!dataLine) continue;

            const payload = dataLine.slice(6).trim();
            if (!payload) continue;

            if (payload === "[DONE]") {
              controller.enqueue(
                encodeSse({ type: "done", content: accumulated, done: true }),
              );
              continue;
            }

            let parsed: {
              choices?: { delta?: { content?: string } }[];
            };
            try {
              parsed = JSON.parse(payload);
            } catch {
              continue;
            }

            const delta = parsed.choices?.[0]?.delta?.content ?? "";
            if (!delta) continue;

            accumulated += delta;
            controller.enqueue(
              encodeSse({ type: "delta", delta, content: accumulated }),
            );
          }
        }

        if (accumulated) {
          controller.enqueue(
            encodeSse({ type: "done", content: accumulated, done: true }),
          );
        }
      } catch {
        controller.enqueue(encodeSse({ type: "error", error: "stream_failed" }));
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });
}

async function handleOpenAI(body: RequestBody, message: string, stream: boolean) {
  const started = Date.now();
  const config = readServerAIConfig();
  const apiKey = process.env.OPENAI_API_KEY;
  const model = resolveRequestModel(body.model, config, "openai");

  if (!apiKey) {
    return json(
      { error: "AI service unavailable", code: "provider_not_configured" },
      503,
    );
  }

  const system = buildPrompt(body);
  const upstream = await callOpenAI(
    config.openai.baseUrl,
    apiKey,
    model,
    system,
    body.history ?? [],
    message,
    stream,
  );

  if (!upstream.ok) {
    return json({ error: "OpenAI upstream error", code: "upstream_error" }, 502);
  }

  if (stream) {
    if (!upstream.body) {
      return json({ error: "No stream from OpenAI", code: "no_stream" }, 502);
    }
    logConciergeEvent({
      conversationId: body.conversationId,
      provider: "openai",
      model,
      latencyMs: Date.now() - started,
      stream: true,
    });
    return sse(pipeOpenAIStream(upstream));
  }

  const data = (await upstream.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return json({ error: "Empty completion", code: "empty_response" }, 502);
  return json({ content });
}

async function handleClaude(body: RequestBody, message: string, stream: boolean) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const config = readServerAIConfig();
  const model = resolveRequestModel(body.model, config, "claude");

  if (!apiKey) {
    return json(
      { error: "AI service unavailable", code: "provider_not_configured" },
      503,
    );
  }

  const system = buildPrompt(body);
  const messages = buildMessages(body.history ?? [], message);
  const upstream = await callClaude(apiKey, model, system, messages, stream);

  if (!upstream.ok) {
    return json({ error: "Claude upstream error", code: "upstream_error" }, 502);
  }

  if (stream) {
    if (!upstream.body) {
      return json({ error: "No stream from Claude", code: "no_stream" }, 502);
    }
    return sse(pipeClaudeStream(upstream));
  }

  const data = (await upstream.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = (data.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("")
    .trim();

  if (!text) return json({ error: "Empty completion", code: "empty_response" }, 502);
  return json({ content: text });
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed", code: "method_not_allowed" }, 405);
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return json({ error: "Invalid request", code: "invalid_request" }, 400);
  }

  const message = (body.message ?? "").trim();
  if (!message) return json({ error: "Empty message", code: "empty_message" }, 400);

  const config = readServerAIConfig();
  const provider = resolveProvider(body, config);
  const stream = Boolean(body.stream);

  try {
    if (provider === "gemini") {
      return await handleGemini(body, message, stream);
    }
    if (provider === "openai") {
      return await handleOpenAI(body, message, stream);
    }
    if (provider === "claude") {
      return await handleClaude(body, message, stream);
    }

    return json({ error: `Provider "${provider}" is not supported`, code: "unsupported_provider" }, 400);
  } catch {
    return json({ error: "AI service unreachable", code: "service_unreachable" }, 502);
  }
};
