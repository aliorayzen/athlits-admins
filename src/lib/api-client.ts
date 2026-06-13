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

// Single in-flight refresh shared across concurrent 401/403 responses.
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

    // Dedupe concurrent refreshes. Clearing the promise in `finally` (not in
    // the .then/.catch branches) prevents a race where one waiter clears it
    // while a sibling is still awaiting the same in-flight refresh.
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    try {
      const newToken = await refreshPromise;
      originalRequest._authRetried = true;
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
      }
      return apiClient(originalRequest);
    } catch {
      // Refresh failed → session is dead. Clear everything and bounce to login.
      clearTokens();
      redirectToLogin();
      return Promise.reject(error);
    }
  },
);

// Exported so auth-context can call it during boot when the access token is
// expired but a refresh token is still present.
export async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token");
  }

  // Use plain axios (not apiClient) so this call doesn't go through the
  // 401/403 refresh interceptor — refreshing the refresh is a bug, not a feature.
  // We pay the cost of unwrapping the envelope manually here for the same reason.
  const { data: body } = await axios.post<
    ApiEnvelope<AuthResponse> | AuthResponse
  >(`${API_BASE_URL}/api/admin/v1/auth/refresh`, { refreshToken });

  const auth = isEnvelope(body) ? (body.data as AuthResponse) : body;

  if (!auth?.accessToken || !auth?.refreshToken) {
    throw new Error("Refresh response missing tokens");
  }

  setTokens(auth.accessToken, auth.refreshToken);
  return auth.accessToken;
}
