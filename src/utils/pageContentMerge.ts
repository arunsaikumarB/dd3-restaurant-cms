function isNonEmptyScalar(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number" || typeof value === "boolean") return true;
  return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeNestedRecord(
  fallback: Record<string, unknown>,
  dbValue: unknown,
): Record<string, unknown> {
  if (!isPlainObject(dbValue)) {
    return fallback;
  }

  const merged: Record<string, unknown> = { ...fallback };
  for (const [key, fallbackVal] of Object.entries(fallback)) {
    const dbVal = dbValue[key];
    if (Array.isArray(fallbackVal)) {
      if (Array.isArray(dbVal) && dbVal.length > 0) {
        merged[key] = dbVal;
      }
      continue;
    }
    if (isPlainObject(fallbackVal) && isPlainObject(dbVal)) {
      merged[key] = mergeNestedRecord(fallbackVal, dbVal);
      continue;
    }
    if (isNonEmptyScalar(dbVal)) {
      merged[key] = dbVal;
    }
  }

  for (const [key, dbVal] of Object.entries(dbValue)) {
    if (key in merged) continue;
    if (isNonEmptyScalar(dbVal) || (Array.isArray(dbVal) && dbVal.length > 0)) {
      merged[key] = dbVal;
    }
  }

  return merged;
}

/** Merge DB JSON over typed fallbacks — never returns blank scalars when a fallback exists. */
export function mergePageContentSection<T extends Record<string, unknown>>(
  fallbacks: T,
  dbContent: Record<string, unknown> | undefined,
): T {
  if (!dbContent) {
    return fallbacks;
  }
  return mergeNestedRecord(fallbacks, dbContent) as T;
}
