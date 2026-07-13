/**
 * Gemini Live / Native Audio — Netlify function.
 * Keeps GEMINI_API_KEY server-side. Supports health, speak, transcribe, session_config.
 * Planner is never invoked here — speech I/O only.
 */

type SpeakBody = {
  action?: "health" | "speak" | "transcribe" | "session_config";
  text?: string;
  language?: string;
  audioBase64?: string;
  mimeType?: string;
  config?: {
    model?: string;
    voiceName?: string;
    temperature?: number;
    streamingEnabled?: boolean;
    sampleRateHz?: number;
    responseStyle?: string;
  };
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });

function readEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

function resolveModel(config?: SpeakBody["config"]): string {
  return (
    config?.model ||
    readEnv("GEMINI_NATIVE_MODEL") ||
    readEnv("GEMINI_LIVE_MODEL") ||
    "gemini-2.5-flash-preview-tts"
  );
}

function resolveVoice(config?: SpeakBody["config"]): string {
  return config?.voiceName || readEnv("GEMINI_NATIVE_VOICE") || "Puck";
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: SpeakBody = {};
  try {
    body = (await req.json()) as SpeakBody;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const action = body.action ?? "health";
  const apiKey = readEnv("GEMINI_API_KEY");
  const voiceProvider = (readEnv("VOICE_PROVIDER") || "gemini-native").toLowerCase();
  const model = resolveModel(body.config);
  const voiceName = resolveVoice(body.config);
  const streaming =
    body.config?.streamingEnabled !== false &&
    (readEnv("GEMINI_NATIVE_STREAMING") || "true").toLowerCase() !== "false";

  if (action === "health") {
    if (!apiKey) {
      return json({
        ok: false,
        status: "unconfigured",
        model,
        streaming,
        latencyMs: 0,
        message: "GEMINI_API_KEY is not configured.",
        checkedAt: new Date().toISOString(),
        voiceProvider,
      });
    }
    const started = Date.now();
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}?key=${encodeURIComponent(apiKey)}`,
      );
      const latencyMs = Date.now() - started;
      if (!res.ok) {
        return json({
          ok: false,
          status: "degraded",
          model,
          streaming,
          latencyMs,
          message: `Model probe HTTP ${res.status}`,
          checkedAt: new Date().toISOString(),
          voiceProvider,
        });
      }
      return json({
        ok: true,
        status: "healthy",
        model,
        streaming,
        latencyMs,
        message: "Gemini Native Audio reachable.",
        checkedAt: new Date().toISOString(),
        voiceProvider,
      });
    } catch (e) {
      return json({
        ok: false,
        status: "down",
        model,
        streaming,
        latencyMs: Date.now() - started,
        message: e instanceof Error ? e.message : "health failed",
        checkedAt: new Date().toISOString(),
        voiceProvider,
      });
    }
  }

  if (action === "session_config") {
    if (!apiKey) return json({ error: "GEMINI_API_KEY is not configured." }, 503);
    // Ephemeral session config for browser Live WS. Prefer proxying via signed URL in production.
    const liveModel =
      readEnv("GEMINI_LIVE_MODEL") ||
      "gemini-2.5-flash-preview-native-audio-dialog";
    return json({
      ok: true,
      model: liveModel,
      voiceName,
      streaming,
      sampleRateHz: body.config?.sampleRateHz ?? 24000,
      // Clients should use REST speak/transcribe unless a secure proxy WS is configured.
      wsUrl: null,
      note: "Use action=speak/transcribe for production speech I/O. Live WS URL can be enabled via secure proxy.",
    });
  }

  if (!apiKey) return json({ ok: false, error: "GEMINI_API_KEY is not configured." }, 503);

  if (action === "speak") {
    const text = (body.text ?? "").trim();
    if (!text) return json({ ok: false, error: "text is required" }, 400);
    const started = Date.now();
    const langHint =
      body.language === "hi"
        ? "Speak in Hindi."
        : body.language === "te"
          ? "Speak in Telugu."
          : "Speak in English.";
    const style =
      body.config?.responseStyle === "concise"
        ? "Keep delivery concise."
        : body.config?.responseStyle === "warm"
          ? "Use a warm, hospitality tone."
          : "Sound natural and conversational.";

    try {
      // Prefer native audio generation when the model supports AUDIO modality.
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `You are Cheffy's speech layer. ${langHint} ${style} Read the following guest-facing line aloud naturally with brief pauses. Do not add extra commentary.\n\n${text}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: body.config?.temperature ?? 0.7,
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName },
                },
              },
            },
          }),
        },
      );

      const payload = (await res.json()) as {
        error?: { message?: string };
        candidates?: Array<{
          content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string }; text?: string }> };
        }>;
      };

      if (!res.ok) {
        // Soft-ok degraded: allow client failover without hard 500 for model mismatches
        return json({
          ok: false,
          provider: "gemini_native",
          latencyMs: Date.now() - started,
          error: payload.error?.message ?? `HTTP ${res.status}`,
          fallbackSuggested: true,
        });
      }

      const parts = payload.candidates?.[0]?.content?.parts ?? [];
      const inline = parts.find((p) => p.inlineData?.data)?.inlineData;
      if (inline?.data) {
        return json({
          ok: true,
          provider: "gemini_native",
          latencyMs: Date.now() - started,
          audioBase64: inline.data,
          mimeType: inline.mimeType ?? "audio/pcm",
          spokenInBrowser: false,
        });
      }

      return json({
        ok: false,
        provider: "gemini_native",
        latencyMs: Date.now() - started,
        error: "No audio returned from Gemini (model may not support AUDIO modality).",
        fallbackSuggested: true,
      });
    } catch (e) {
      return json({
        ok: false,
        provider: "gemini_native",
        latencyMs: Date.now() - started,
        error: e instanceof Error ? e.message : "speak failed",
        fallbackSuggested: true,
      });
    }
  }

  if (action === "transcribe") {
    const audioBase64 = body.audioBase64 ?? "";
    if (!audioBase64) return json({ ok: false, error: "audioBase64 is required" }, 400);
    const started = Date.now();
    const mime = body.mimeType || "audio/wav";
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(readEnv("GEMINI_MODEL") || "gemini-2.0-flash")}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { inlineData: { mimeType: mime, data: audioBase64 } },
                  {
                    text: "Transcribe this restaurant guest audio. Return only the transcript text. Detect language if possible (en/hi/te).",
                  },
                ],
              },
            ],
          }),
        },
      );
      const payload = (await res.json()) as {
        error?: { message?: string };
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      if (!res.ok) {
        return json({
          ok: false,
          error: payload.error?.message ?? `HTTP ${res.status}`,
          latencyMs: Date.now() - started,
        });
      }
      const text = (payload.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join(" ")
        .trim();
      return json({
        ok: true,
        text,
        language: body.language ?? null,
        confidence: text ? 0.85 : 0,
        latencyMs: Date.now() - started,
      });
    } catch (e) {
      return json({
        ok: false,
        error: e instanceof Error ? e.message : "transcribe failed",
        latencyMs: Date.now() - started,
      });
    }
  }

  return json({ error: `Unknown action: ${action}` }, 400);
};
