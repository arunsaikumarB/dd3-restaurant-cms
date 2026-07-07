/**
 * Server-side AI configuration (env-driven).
 * Prepared for future Admin CMS UI — do not expose secrets to the client.
 */

export type AIProviderId = "gemini" | "openai" | "claude" | "mock";

export type ProviderRuntimeConfig = {
  provider: AIProviderId;
  gemini: {
    model: string;
    temperature: number;
    topP: number;
    maxOutputTokens: number;
    streaming: boolean;
  };
  openai: {
    model: string;
    temperature: number;
    maxOutputTokens: number;
    baseUrl: string;
  };
  claude: {
    model: string;
    temperature: number;
    maxOutputTokens: number;
  };
  promptVersion: string;
};

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

/** Read from process.env — Netlify functions only. */
export function readServerAIConfig(env: NodeJS.ProcessEnv = process.env): ProviderRuntimeConfig {
  const provider = (env.AI_PROVIDER ?? "gemini").toLowerCase() as AIProviderId;

  return {
    provider,
    gemini: {
      model: env.GEMINI_MODEL ?? "gemini-2.0-flash",
      temperature: num(env.GEMINI_TEMPERATURE, 0.4),
      topP: num(env.GEMINI_TOP_P, 0.95),
      maxOutputTokens: num(env.GEMINI_MAX_OUTPUT_TOKENS, 1024),
      streaming: bool(env.GEMINI_STREAMING, true),
    },
    openai: {
      model: env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: num(env.OPENAI_TEMPERATURE, 0.4),
      maxOutputTokens: num(env.OPENAI_MAX_OUTPUT_TOKENS, 1024),
      baseUrl: env.OPENAI_API_BASE_URL ?? "https://api.openai.com/v1",
    },
    claude: {
      model: env.ANTHROPIC_MODEL ?? env.CLAUDE_MODEL ?? "claude-sonnet-4-20250514",
      temperature: num(env.CLAUDE_TEMPERATURE, 0.4),
      maxOutputTokens: num(env.CLAUDE_MAX_OUTPUT_TOKENS, 1024),
    },
    promptVersion: env.CHEFFY_PROMPT_VERSION ?? "1",
  };
}
