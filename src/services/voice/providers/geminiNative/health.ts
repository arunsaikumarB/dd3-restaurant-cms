import type { GeminiNativeConfig, GeminiNativeHealth } from "./types";
import { DEFAULT_GEMINI_NATIVE_CONFIG } from "./types";

const FUNCTION_PATH = "/.netlify/functions/gemini-live";

export async function fetchGeminiNativeHealth(
  config?: Partial<GeminiNativeConfig>,
): Promise<GeminiNativeHealth> {
  const started = performance.now();
  try {
    const res = await fetch(FUNCTION_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "health", config: { ...DEFAULT_GEMINI_NATIVE_CONFIG, ...config } }),
    });
    const data = (await res.json()) as GeminiNativeHealth & { error?: string };
    if (!res.ok) {
      return {
        ok: false,
        status: "down",
        model: config?.model ?? DEFAULT_GEMINI_NATIVE_CONFIG.model,
        streaming: Boolean(config?.streamingEnabled ?? true),
        latencyMs: Math.round(performance.now() - started),
        message: data.error ?? `HTTP ${res.status}`,
        checkedAt: new Date().toISOString(),
      };
    }
    return {
      ...data,
      latencyMs: data.latencyMs ?? Math.round(performance.now() - started),
      checkedAt: data.checkedAt ?? new Date().toISOString(),
    };
  } catch (e) {
    return {
      ok: false,
      status: "down",
      model: config?.model ?? DEFAULT_GEMINI_NATIVE_CONFIG.model,
      streaming: Boolean(config?.streamingEnabled ?? true),
      latencyMs: Math.round(performance.now() - started),
      message: e instanceof Error ? e.message : "health check failed",
      checkedAt: new Date().toISOString(),
    };
  }
}

export function readGeminiNativeConfigFromMetadata(
  metadata: Record<string, unknown> | undefined | null,
): GeminiNativeConfig {
  const raw = (metadata?.geminiNative as Partial<GeminiNativeConfig> | undefined) ?? {};
  return { ...DEFAULT_GEMINI_NATIVE_CONFIG, ...raw };
}
