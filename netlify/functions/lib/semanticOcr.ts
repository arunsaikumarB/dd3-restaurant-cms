/**
 * Gemini multimodal OCR for scanned PDFs and images.
 * Used only when selectable-text extraction is insufficient.
 */
import { readEnv } from "./semanticSupabase";

export type OcrResult = {
  text: string;
  confidence: number | null;
  language: string | null;
  durationMs: number;
  used: boolean;
};

function toBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

function mimeForFile(fileType: string, fileName: string): string {
  const lower = fileName.toLowerCase();
  if (fileType === "pdf" || lower.endsWith(".pdf")) return "application/pdf";
  if (fileType === "png" || lower.endsWith(".png")) return "image/png";
  if (fileType === "webp" || lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export async function runGeminiOcr(
  buffer: ArrayBuffer,
  fileType: string,
  fileName: string,
): Promise<OcrResult> {
  const started = Date.now();
  const apiKey = readEnv("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required for OCR.");
  }

  const model = readEnv("GEMINI_OCR_MODEL") || readEnv("GEMINI_MODEL") || "gemini-2.0-flash";
  const mimeType = mimeForFile(fileType, fileName);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                "Extract ALL readable text from this restaurant document image or scanned PDF. " +
                "Preserve headings and line breaks. Return plain text only. " +
                "If mostly English/Hindi/Telugu, keep original script. Do not translate.",
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: toBase64(buffer),
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OCR failed (${response.status}): ${errText.slice(0, 240)}`);
  }

  const json = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text =
    json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("\n").trim() ?? "";

  return {
    text,
    confidence: text.length > 40 ? 0.85 : text.length > 0 ? 0.55 : 0.1,
    language: null,
    durationMs: Date.now() - started,
    used: true,
  };
}

export function needsOcr(extractedText: string, fileType: string, minChars = 40): boolean {
  const imageTypes = new Set(["jpeg", "png", "webp"]);
  if (imageTypes.has(fileType)) return true;
  return extractedText.trim().length < minChars;
}
