import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "./token-store";
import type { ApiEnvelope, AuthResponse } from "@/types/api";

declare module "axios" {
  export interface AxiosRequestConfig {
    preserveEnvelope?: boolean;
  }

  export interface InternalAxiosRequestConfig {
    preserveEnvelope?: boolean;
  }
}

// The backend wraps every successful response as
//   { data: T, message: string | null, errors: unknown | null }
// We unwrap it once at the interceptor so call sites can keep using
// `apiClient.post<T>()` and get T back directly (matching the typing).
function isEnvelope(body: unknown): body is ApiEnvelope<unknown> {
  if (!body || typeof body !== "object") return false;
  const o = body as Record<string, unknown>;
  // An envelope has `data` plus at least one of `message` / `errors`. Checking
  // both gates out coincidental backend payloads that happen to have a `data`
  // field of their own (e.g. nested resources).
  return "data" in o && ("message" in o || "errors" in o);
}

function unwrapEnvelope<T>(response: AxiosResponse<unknown>): AxiosResponse<T> {
  if (response.config.preserveEnvelope) {
    return response as AxiosResponse<T>;
  }
  if (isEnvelope(response.data)) {
    (response as AxiosResponse<unknown>).data = response.data.data;
  }
  return response as AxiosResponse<T>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// Augment Axios's request config with a one-shot retry marker so we never loop
// on a request that already failed *after* a successful refresh. Without this
// flag, a backend that consistently returns 401/403 would refresh → retry →
// 401/403 → refresh → ... forever.
interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _authRetried?: boolean;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach access token to every request
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Thrown ONLY when the backend definitively rejects the refresh token (i.e. it
// answered with 400/401/403, or there is no refresh token to send). This is the
// single signal that means "the session is truly dead, clear it and bounce to
// login". Every other failure (network down, timeout, 5xx, cold start) is
// transient and MUST NOT end the session — see the interceptor catch below.
export class SessionExpiredError extends Error {
  constructor(message = "Session expired") {
    super(message);
    this.name = "SessionExpiredError";
  }
}

// A definitive auth rejection is one where the server actually responded with a
// client-auth status. A 5xx or a missing response (network/CORS/cold start) is
// NOT definitive — the refresh token may still be perfectly valid.
function isDefinitiveAuthRejection(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  const status = err.response?.status;
  return status === 400 || status === 401 || status === 403;
}

// Backoff schedule for transient refresh failures. Four total attempts
// (immediate + 3 retries) over ~7s — comfortably inside the proactive refresh
// lead time, so a flaky/cold-starting backend gets several chances before we
// give up, and giving up does NOT log the user out (it just fails the request).
const TRANSIENT_RETRY_DELAYS_MS = [1000, 2000, 4000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Single in-flight refresh shared across EVERY caller (the 401/403 interceptor,
// the proactive scheduler, and the auth-context boot). Deduping here — rather
// than per-caller — guarantees we never fire two concurrent refreshes with the
// same (single-use) refresh token, which a rotating backend could treat as
// token reuse and revoke the whole session.
let refreshPromise: Promise<string> | null = null;

// Per request: paths under `/auth/` are themselves part of the auth flow
// (login, verify-otp, refresh, logout). A 401 from those endpoints MUST NOT
// trigger another refresh — that would either loop or hide a legitimate
// authentication failure from the user.
function isAuthEndpoint(url: string | undefined): boolean {
  return Boolean(url?.includes("/auth/"));
}

function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  const from = window.location.pathname + window.location.search;
  // Don't redirect if we're already on /login — avoids a wasted navigation.
  if (window.location.pathname === "/login") return;
  window.location.href = `/login?from=${encodeURIComponent(from)}`;
}

apiClient.interceptors.response.use(
  (response) => unwrapEnvelope(response),
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const status = error.response?.status;

    // No HTTP response at all (network down, CORS, DNS) — propagate as-is.
    // The caller decides how to surface this; we don't pretend it's an
    // auth failure and we don't trigger a refresh.
    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    // User instruction: attempt refresh on BOTH 401 and 403. The retry guard
    // (_authRetried) ensures we try refresh at most ONCE per original
    // request, regardless of which status code triggered it.
    const isAuthFailure = status === 401 || status === 403;
    if (
      !isAuthFailure ||
      originalRequest._authRetried ||
      isAuthEndpoint(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    try {
      const newToken = await refreshAccessToken();
      originalRequest._authRetried = true;
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
      }
      return apiClient(originalRequest);
    } catch (refreshError) {
      // ONLY a definitive rejection ends the session. A transient failure
      // (network/timeout/5xx/cold start) leaves the tokens intact so the very
      // next request — or the proactive scheduler — can recover. We reject the
      // ORIGINAL error either way so the caller can surface/retry it.
      if (refreshError instanceof SessionExpiredError) {
        clearTokens();
        redirectToLogin();
      }
      return Promise.reject(error);
    }
  },
);

// Exported so the interceptor, the proactive scheduler, and the auth-context
// boot can all request a refresh. Deduped: concurrent callers share one
// in-flight request. Clearing the promise in `finally` (not in then/catch)
// prevents a sibling waiter from clearing it mid-flight.
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// One refresh attempt with transient-failure retries. Throws SessionExpiredError
// ONLY when the session is genuinely dead (no refresh token, or the backend
// answered with a 4xx auth rejection). Transient failures are retried with
// backoff and, if still failing, surface as a generic Error so the caller keeps
// the session alive.
async function performRefresh(): Promise<string> {
  if (!getRefreshToken()) {
    throw new SessionExpiredError("No refresh token");
  }

  let lastError: unknown;
  for (
    let attempt = 0;
    attempt <= TRANSIENT_RETRY_DELAYS_MS.length;
    attempt++
  ) {
    try {
      // Re-read the refresh token each attempt: a prior attempt could have
      // rotated it before failing on a later step.
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new SessionExpiredError("No refresh token");

      // Plain axios (not apiClient) so this call skips the 401/403 refresh
      // interceptor — refreshing the refresh is a bug, not a feature. A 15s
      // timeout bounds cold-start hangs so retries actually get to run.
      const { data: body } = await axios.post<
        ApiEnvelope<AuthResponse> | AuthResponse
      >(
        `${API_BASE_URL}/api/admin/v1/auth/refresh`,
        { refreshToken },
        { timeout: 15000 },
      );

      const auth = isEnvelope(body) ? (body.data as AuthResponse) : body;
      if (!auth?.accessToken) {
        // Malformed-but-2xx: don't trust it, but don't nuke the session either.
        throw new Error("Refresh response missing access token");
      }

      // Tolerate a backend that does NOT rotate the refresh token: keep the
      // existing one when the response omits it, instead of failing the refresh.
      const nextRefresh =
        auth.refreshToken && auth.refreshToken.length > 0
          ? auth.refreshToken
          : getRefreshToken();
      if (!nextRefresh) {
        throw new SessionExpiredError("No refresh token after refresh");
      }

      setTokens(auth.accessToken, nextRefresh);
      return auth.accessToken;
    } catch (err) {
      if (err instanceof SessionExpiredError) throw err;
      if (isDefinitiveAuthRejection(err)) {
        throw new SessionExpiredError("Refresh token rejected");
      }
      // Transient (network / timeout / 5xx): retry if attempts remain.
      lastError = err;
      const delay = TRANSIENT_RETRY_DELAYS_MS[attempt];
      if (delay === undefined) break;
      await sleep(delay);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Refresh failed after retries");
}
