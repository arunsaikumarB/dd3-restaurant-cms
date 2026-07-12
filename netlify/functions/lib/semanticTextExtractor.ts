export async function extractTextFromBuffer(
  buffer: ArrayBuffer,
  fileType: string,
  fileName: string,
): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const lower = fileName.toLowerCase();

  if (fileType === "txt" || fileType === "markdown" || fileType === "csv" || lower.endsWith(".txt") || lower.endsWith(".md")) {
    return new TextDecoder("utf-8").decode(bytes).trim();
  }

  if (fileType === "html" || lower.endsWith(".html") || lower.endsWith(".htm")) {
    const html = new TextDecoder("utf-8").decode(bytes);
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (fileType === "pdf" || lower.endsWith(".pdf")) {
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(Buffer.from(bytes));
      return (result.text ?? "").trim();
    } catch {
      // Scanned/corrupt PDFs fall through to OCR in the index pipeline.
      return "";
    }
  }

  if (fileType === "docx" || lower.endsWith(".docx")) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      return (result.value ?? "").trim();
    } catch {
      throw new Error("DOCX extraction failed. Ensure mammoth is available.");
    }
  }

  // Images have no selectable text — OCR pipeline handles them.
  if (
    fileType === "jpeg" ||
    fileType === "png" ||
    fileType === "webp" ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp")
  ) {
    return "";
  }

  throw new Error(`Unsupported file type for extraction: ${fileType}`);
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function chunkText(text: string, chunkSize = 900, overlap = 120): Array<{ index: number; content: string; tokenEstimate: number }> {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\t/g, " ").replace(/ +/g, " ").trim();
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
