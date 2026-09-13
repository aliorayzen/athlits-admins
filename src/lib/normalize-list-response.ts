function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Admin list endpoints are deployed in two compatible shapes: a raw array or
 * an object containing that array under `data`/`content`. Keep that transport
 * detail at the API boundary so rendering code can always rely on an array.
 */
export function normalizeListResponse<T>(
  value: unknown,
  resourceName: string,
): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!isRecord(value)) {
    throw new Error(`${resourceName} response was not a list.`);
  }

  if (Array.isArray(value.content)) return value.content as T[];
  if (Array.isArray(value.data)) return value.data as T[];
  if (isRecord(value.data) && Array.isArray(value.data.content)) {
    return value.data.content as T[];
  }

  throw new Error(`${resourceName} response was not a list.`);
}
