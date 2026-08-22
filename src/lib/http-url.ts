export const MAX_HTTP_URL_LENGTH = 2048;

export function getOptionalHttpUrlError(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim() ?? "";
  if (!normalized) return null;

  if (normalized.length > MAX_HTTP_URL_LENGTH) {
    return `Use ${MAX_HTTP_URL_LENGTH} characters or fewer.`;
  }

  try {
    const url = new URL(normalized);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      !url.hostname
    ) {
      return "Enter a valid URL starting with http:// or https://.";
    }
  } catch {
    return "Enter a valid URL starting with http:// or https://.";
  }

  return null;
}

export function normalizeOptionalHttpUrl(
  value: string | null | undefined,
): string | null {
  const error = getOptionalHttpUrlError(value);
  if (error) throw new Error(error);
  return value?.trim() || null;
}
