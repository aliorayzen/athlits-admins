// Cookies are the single source of truth for auth tokens. We deliberately do
// NOT use localStorage:
//   - Removes the localStorage/cookie sync problem we had before.
//   - One place for the proxy, the api-client interceptor, and (eventually)
//     server components to read from.
//   - Same XSS exposure as non-HttpOnly cookies, so no security regression.
//   - A future hardening pass can move to HttpOnly cookies + a server-side
//     route handler that proxies API calls; that change is contained to this
//     file plus the request interceptor.

// Cookie names MUST match what `src/proxy.ts` reads.
export const ACCESS_TOKEN_COOKIE = "arena_admin_access_token";
export const REFRESH_TOKEN_COOKIE = "arena_admin_refresh_token";

// 30 days outlives the short access token and matches typical refresh-token
// lifetimes. The reactive 401→refresh flow keeps the access token rotated
// inside this window; clearTokens() is the authoritative end-of-session.
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30d

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split("; ")) {
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.slice(prefix.length));
    }
  }
  return null;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

// One-time cleanup of the previous localStorage-backed token store. Runs once
// on module load in the browser. Safe to leave indefinitely — it's a no-op
// for users who never had the old version.
if (typeof window !== "undefined") {
  try {
    if (
      localStorage.getItem(ACCESS_TOKEN_COOKIE) !== null ||
      localStorage.getItem(REFRESH_TOKEN_COOKIE) !== null
    ) {
      localStorage.removeItem(ACCESS_TOKEN_COOKIE);
      localStorage.removeItem(REFRESH_TOKEN_COOKIE);
    }
  } catch {
    // localStorage may be unavailable (private mode, disabled storage); ignore.
  }
}

export function getAccessToken(): string | null {
  return readCookie(ACCESS_TOKEN_COOKIE);
}

export function getRefreshToken(): string | null {
  return readCookie(REFRESH_TOKEN_COOKIE);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  writeCookie(ACCESS_TOKEN_COOKIE, accessToken);
  writeCookie(REFRESH_TOKEN_COOKIE, refreshToken);
}

export function clearTokens(): void {
  deleteCookie(ACCESS_TOKEN_COOKIE);
  deleteCookie(REFRESH_TOKEN_COOKIE);
}
