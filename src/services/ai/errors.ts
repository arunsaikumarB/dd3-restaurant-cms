export class AIProviderError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "AIProviderError";
    this.code = code;
    this.status = status;
  }
}

/** User-facing copy — never expose technical errors to guests. */
export const CHEFFY_KITCHEN_ERROR =
  "I'm having a little trouble reaching my kitchen right now.\n\nPlease try again in a moment.";

export const CHEFFY_ERROR_MESSAGE = CHEFFY_KITCHEN_ERROR;

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

export function isProviderUnavailable(err: unknown): boolean {
  return err instanceof AIProviderError && (err.status === 503 || err.status === 502);
}

export function toGuestErrorMessage(_err: unknown): string {
  return CHEFFY_KITCHEN_ERROR;
}
