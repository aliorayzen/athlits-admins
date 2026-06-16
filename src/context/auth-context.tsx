"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { UserDto } from "@/types/api";
import { adminLogout, adminVerifyOtp, getCurrentUser } from "@/lib/api";
import { refreshAccessToken, SessionExpiredError } from "@/lib/api-client";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/token-store";

interface AuthState {
  user: UserDto | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, otp: string, redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split(".")[1];
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function payloadToUser(payload: Record<string, unknown>): UserDto {
  // JWT `sub` may be a string or a number depending on the issuer; coerce so
  // our string-typed UserDto.id never holds a numeric value at runtime.
  // Empty strings for fields the JWT doesn't carry — they'll be replaced by
  // the real values on the next login or user-detail fetch.
  const now = new Date().toISOString();
  return {
    id: String(payload.sub ?? ""),
    role: (payload.role as UserDto["role"]) ?? "ADMIN",
    email: "",
    firstName: "",
    lastName: "",
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
}

function isTokenExpired(payload: Record<string, unknown> | null): boolean {
  if (!payload) return true;
  if (typeof payload.exp !== "number") return false;
  return payload.exp * 1000 < Date.now();
}

// Refresh proactively, this far before the access token's `exp`, so a refresh
// never has to ride on the critical path of a user click (where the backend's
// worst-case latency would surface as a logout). The lead time also leaves room
// for the refresh's own transient-failure retries to complete before expiry.
const REFRESH_LEAD_MS = 30 * 1000;
// Never schedule a zero/negative timer; if we're already inside the lead window
// (e.g. just hydrated a nearly-expired token), refresh almost immediately.
const MIN_REFRESH_DELAY_MS = 1 * 1000;
// After a transient proactive-refresh failure, retry on this cadence. The
// session is still alive; we just couldn't reach the backend this instant.
const TRANSIENT_REFRESH_RETRY_MS = 10 * 1000;

// ms from now until we should proactively refresh the given access token, or
// null if the token has no usable `exp` (then we fall back to reactive refresh).
function computeRefreshDelayMs(token: string | null): number | null {
  if (!token) return null;
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return null;
  const fireAt = payload.exp * 1000 - REFRESH_LEAD_MS;
  return Math.max(MIN_REFRESH_DELAY_MS, fireAt - Date.now());
}

// Always returns loading on first render (SSR + client agree), hydration happens in useEffect
const INITIAL_STATE: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>(INITIAL_STATE);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Holds the latest scheduler so the self-rescheduling timer callbacks always
  // call the current closure without referencing it before initialization.
  const scheduleRef = useRef<() => void>(() => {});

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // Proactively refresh shortly before the access token expires, then reschedule
  // off the freshly-issued token. The shared dedupe in `refreshAccessToken`
  // means this never races the reactive 401 path. We only end the session on a
  // definitive rejection (SessionExpiredError); a transient failure just retries
  // soon, leaving the user logged in.
  const scheduleProactiveRefresh = useCallback(() => {
    clearRefreshTimer();
    const delay = computeRefreshDelayMs(getAccessToken());
    if (delay === null) return;

    refreshTimerRef.current = setTimeout(() => {
      void refreshAccessToken()
        .then(() => scheduleRef.current())
        .catch((err: unknown) => {
          if (err instanceof SessionExpiredError) {
            clearRefreshTimer();
            clearTokens();
            setState({ user: null, isLoading: false, isAuthenticated: false });
            router.push("/login");
            return;
          }
          // Transient: keep the session, try again shortly.
          refreshTimerRef.current = setTimeout(
            () => scheduleRef.current(),
            TRANSIENT_REFRESH_RETRY_MS,
          );
        });
    }, delay);
  }, [clearRefreshTimer, router]);

  // Keep the recursion ref pointed at the latest scheduler closure.
  useEffect(() => {
    scheduleRef.current = scheduleProactiveRefresh;
  }, [scheduleProactiveRefresh]);

  // Arm the scheduler whenever we hold a session, disarm it otherwise. The
  // scheduler re-arms itself off each new token; this effect handles the
  // login/logout edges and unmount cleanup.
  useEffect(() => {
    if (state.isAuthenticated) {
      scheduleProactiveRefresh();
    } else {
      clearRefreshTimer();
    }
    return clearRefreshTimer;
  }, [state.isAuthenticated, scheduleProactiveRefresh, clearRefreshTimer]);

  // Hydrate auth state after mount. The flow:
  //   1. No access token AND no refresh token  → unauthenticated.
  //   2. Access token present and valid        → authenticated (cookie re-synced).
  //   3. Access token expired/missing but
  //      refresh token present                 → call /refresh; success → auth,
  //                                              failure → clear + unauthenticated.
  // We never optimistically render dashboard chrome with an expired token —
  // either we have a valid session or we don't, decided before isLoading flips.
  useEffect(() => {
    let cancelled = false;

    // The JWT carries no name/email, so the user we build from it shows the
    // "Admin" placeholder. Fetch the real profile in the background and merge it
    // in once it arrives — we never block isLoading on this (Render cold-starts
    // can be slow). The functional update + isAuthenticated guard ensures a
    // late-arriving profile can't resurrect a session the user just logged out
    // of.
    const loadProfile = async () => {
      try {
        const profile = await getCurrentUser();
        if (cancelled) return;
        setState((prev) =>
          prev.isAuthenticated ? { ...prev, user: profile } : prev,
        );
      } catch {
        // Keep the JWT-derived user; the UI falls back to the "Admin" label.
      }
    };

    const hydrate = async () => {
      const access = getAccessToken();
      const refresh = getRefreshToken();

      // Case 1: nothing to work with
      if (!access && !refresh) {
        if (!cancelled) {
          setState({ user: null, isLoading: false, isAuthenticated: false });
        }
        return;
      }

      // Case 2: access token still valid
      if (access) {
        const payload = parseJwtPayload(access);
        if (payload && !isTokenExpired(payload)) {
          if (!cancelled) {
            setState({
              user: payloadToUser(payload),
              isLoading: false,
              isAuthenticated: true,
            });
            void loadProfile();
          }
          return;
        }
      }

      // Case 3: try refresh
      if (refresh) {
        try {
          const newAccess = await refreshAccessToken();
          if (cancelled) return;
          const payload = parseJwtPayload(newAccess);
          if (payload) {
            setState({
              user: payloadToUser(payload),
              isLoading: false,
              isAuthenticated: true,
            });
            void loadProfile();
            return;
          }
        } catch {
          // refresh failed → fall through to clearing tokens
        }
      }

      clearTokens();
      if (!cancelled) {
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, otp: string, redirectTo?: string) => {
      const response = await adminVerifyOtp({ email, otp });
      setTokens(response.accessToken, response.refreshToken);
      setState({
        user: response.user,
        isLoading: false,
        isAuthenticated: true,
      });
      // Only honor in-app paths to prevent open-redirect via ?from=https://evil.example
      const safeRedirect =
        redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
          ? redirectTo
          : "/dashboard";
      router.push(safeRedirect);
    },
    [router],
  );

  const logout = useCallback(async () => {
    try {
      await adminLogout();
    } catch {
      // Best-effort logout
    }
    clearTokens();
    setState({ user: null, isLoading: false, isAuthenticated: false });
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({ ...state, login, logout }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
