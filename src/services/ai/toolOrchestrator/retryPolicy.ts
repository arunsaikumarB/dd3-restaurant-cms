export type RetryPolicy = {
  maxRetries: number;
  baseDelayMs: number;
};

export const DEFAULT_RETRY: RetryPolicy = {
  maxRetries: 1,
  baseDelayMs: 40,
};

export async function withRetry<T>(
  policy: RetryPolicy,
  fn: () => Promise<T>,
  onRetry?: (attempt: number) => void,
): Promise<{ value: T; retries: number }> {
  let lastError: unknown;
  let retries = 0;
  for (let attempt = 0; attempt <= policy.maxRetries; attempt += 1) {
    try {
      const value = await fn();
      return { value, retries };
    } catch (err) {
      lastError = err;
      if (attempt < policy.maxRetries) {
        retries += 1;
        onRetry?.(retries);
        await sleep(policy.baseDelayMs * (attempt + 1));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
