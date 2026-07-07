const MAX_WORDS = 80;

export function condenseDisplayText(text: string, isComplete: boolean): string {
  if (!isComplete || !text.trim()) return text;

  const words = text.trim().split(/\s+/);
  if (words.length <= MAX_WORDS) return text;

  const trimmed = words.slice(0, MAX_WORDS).join(" ");
  return `${trimmed}…`;
}
