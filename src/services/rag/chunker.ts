export type TextChunk = {
  index: number;
  content: string;
  tokenEstimate: number;
};

const DEFAULT_CHUNK_SIZE = 900;
const DEFAULT_CHUNK_OVERLAP = 120;

/** Rough token estimate — ~4 chars per token for English prose. */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\t/g, " ").replace(/ +/g, " ").trim();
}

/** Split on paragraph boundaries first, then hard-wrap long sections. */
export function chunkText(
  text: string,
  options?: { chunkSize?: number; overlap?: number },
): TextChunk[] {
  const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = options?.overlap ?? DEFAULT_CHUNK_OVERLAP;
  const normalized = normalizeWhitespace(text);
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const rawChunks: string[] = [];

  let buffer = "";
  for (const paragraph of paragraphs) {
    if ((buffer + "\n\n" + paragraph).length <= chunkSize) {
      buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
      continue;
    }
    if (buffer) rawChunks.push(buffer);
    if (paragraph.length <= chunkSize) {
      buffer = paragraph;
      continue;
    }
    for (let i = 0; i < paragraph.length; i += chunkSize - overlap) {
      rawChunks.push(paragraph.slice(i, i + chunkSize));
    }
    buffer = "";
  }
  if (buffer) rawChunks.push(buffer);

  return rawChunks.map((content, index) => ({
    index,
    content,
    tokenEstimate: estimateTokens(content),
  }));
}
