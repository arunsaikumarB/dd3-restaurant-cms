/** Translation-ready language catalog — extend freely without hardcoding rules elsewhere. */

export type KnowledgeLanguageOption = {
  code: string;
  label: string;
  nativeLabel: string;
};

export const KNOWLEDGE_LANGUAGES: KnowledgeLanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు" },
  { code: "unknown", label: "Unknown", nativeLabel: "Unknown" },
];

export function labelForLanguage(code: string): string {
  return KNOWLEDGE_LANGUAGES.find((l) => l.code === code)?.label ?? code.toUpperCase();
}

/** Lightweight script-based detection for admin UX; indexing may refine via model. */
export function detectLanguageFromText(text: string): string {
  const sample = text.slice(0, 4000);
  if (!sample.trim()) return "unknown";

  const telugu = (sample.match(/[\u0C00-\u0C7F]/g) ?? []).length;
  const hindi = (sample.match(/[\u0900-\u097F]/g) ?? []).length;
  const latin = (sample.match(/[A-Za-z]/g) ?? []).length;
  const total = Math.max(telugu + hindi + latin, 1);

  if (telugu / total > 0.2) return "te";
  if (hindi / total > 0.2) return "hi";
  if (latin / total > 0.2) return "en";
  return "unknown";
}
