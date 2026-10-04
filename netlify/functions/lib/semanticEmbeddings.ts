import { fetchWithTimeout, readJsonWithTimeout, readPositiveInt, withTimeout, DEFAULT_MODEL_TIMEOUT_MS } from "./requestGuards";

function readEnv(key: string): string {
  return process.env[key]?.trim() ?? "";
}

function embeddingTimeoutMs(): number {
  return readPositiveInt("MODEL_TIMEOUT_MS", DEFAULT_MODEL_TIMEOUT_MS);
}

export function readGeminiApiKey(): string {
  return readEnv("GEMINI_API_KEY");
}

export const EMBEDDING_MODEL = "text-embedding-004";
export const EMBEDDING_DIMENSIONS = 768;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = readGeminiApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const vectors: number[][] = [];
  const batchSize = 8;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (text) => {
        const timeoutMs = embeddingTimeoutMs();
        const response = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              model: `models/${EMBEDDING_MODEL}`,
              content: { parts: [{ text: text.slice(0, 8000) }] },
            }),
          },
          timeoutMs,
        );

        if (!response.ok) {
          const err = await withTimeout(response.text(), timeoutMs).catch(() => "");
          throw new Error(`Embedding failed (${response.status}): ${err}`);
        }

        const body = await readJsonWithTimeout<{ embedding?: { values?: number[] } }>(response, timeoutMs);
        const values = body.embedding?.values;
        if (!values?.length) throw new Error("Empty embedding response.");
        return values;
      }),
    );
    vectors.push(...results);
  }

  return vectors;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector;
}
