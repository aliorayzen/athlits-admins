import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/token-store";

// Next 16 renamed `middleware.ts` -> `proxy.ts` and exports `proxy` instead of `middleware`.
// This guards `/dashboard/*` at the edge so unauthenticated users never see a flash of
// protected UI. The client-side `useAuth()` guard in `dashboard/layout.tsx` is kept as
// belt-and-braces; this proxy is the primary gate. There is intentionally NO bypass
// mechanism — login via OTP is the only way in.
//
// The "session present" check considers BOTH cookies. If only the refresh
// token is present (access expired/deleted), we let the request through so
// the auth-context boot flow in src/context/auth-context.tsx can hit
// /api/admin/v1/auth/refresh and recover. If refresh fails, the api-client
// clears both cookies and the dashboard layout's client redirect sends the
// user to /login. Doing the refresh client-side keeps the proxy edge-fast
// and avoids a server-to-server hop.

// ── Content-Security-Policy ────────────────────────────────────────────────
// The CSP is the main defense for our tokens: they live in JS-readable cookies,
// so a single injected <script> would mean account takeover. A per-request
// nonce + 'strict-dynamic' means ONLY Next's own bootstrap script runs (and the
// chunks it vouches for) — no 'unsafe-inline' for scripts, so injected inline
// scripts are refused. CSP is applied in PRODUCTION ONLY: the Next dev server
// needs eval/inline and would break under this policy.
const isProd = process.env.NODE_ENV === "production";

// Origins the app legitimately reaches beyond 'self':
//   - the Spring Boot backend (all /api/admin/v1/* axios traffic), and
//   - OpenStreetMap, used only by the venue location picker:
//       * nominatim.openstreetmap.org → location search   (connect-src)
//       * *.tile.openstreetmap.org    → map tile imagery   (img-src)
// If the map is ever removed, delete the two OSM_* entries below.
const BACKEND_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const OSM_NOMINATIM = "https://nominatim.openstreetmap.org";
const OSM_TILES = "https://*.tile.openstreetmap.org";

function buildCsp(nonce: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // Inline styles are required: the UI uses style={} attributes throughout and
    // next/font injects a <style> block. Style injection is far lower risk than
    // script injection, so 'unsafe-inline' here is an accepted trade-off.
    `style-src 'self' 'unsafe-inline'`,
    // data: → grain/noise SVG backgrounds + Leaflet div-icons. blob: → next/image.
    `img-src 'self' data: blob: ${BACKEND_ORIGIN} ${OSM_TILES}`,
    `font-src 'self' data:`,
    `connect-src 'self' ${BACKEND_ORIGIN} ${OSM_NOMINATIM}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `worker-src 'self' blob:`,
  ].join("; ");
}

// Attach the CSP to a response. For document responses we also echo the policy
// and nonce onto the *request* headers so Next can read the nonce and stamp it
// onto its own <script> tags. Redirects don't render scripts, so they only get
// the response header.
function applyCsp(
  request: NextRequest,
  buildResponse: (init?: { request: { headers: Headers } }) => NextResponse,
  isDocument: boolean,
): NextResponse {
  if (!isProd) return buildResponse();

  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  if (!isDocument) {
    const response = buildResponse();
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = buildResponse({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasAccess = Boolean(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value);
  const hasRefresh = Boolean(request.cookies.get(REFRESH_TOKEN_COOKIE)?.value);
  const hasSession = hasAccess || hasRefresh;

  // Root: send to dashboard if any session credential exists, otherwise login.
  if (pathname === "/") {
    const target = hasSession ? "/dashboard" : "/login";
    return applyCsp(
      request,
      () => NextResponse.redirect(new URL(target, request.url)),
      false,
    );
  }

  // Dashboard routes need at least one cookie. The client decides if the
  // refresh can actually succeed.
  if (pathname.startsWith("/dashboard")) {
    if (hasSession) {
      return applyCsp(request, (init) => NextResponse.next(init), true);
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname + search);
    return applyCsp(request, () => NextResponse.redirect(loginUrl), false);
  }

  // Already signed in and visiting /login? Bounce to dashboard. Only check
  // the access cookie here — landing on /login with just a refresh token is
  // legitimate (e.g. after a failed refresh) and shouldn't be auto-bounced.
  if (pathname === "/login" && hasAccess) {
    return applyCsp(
      request,
      () => NextResponse.redirect(new URL("/dashboard", request.url)),
      false,
    );
  }

  // /login (unauthenticated) — a real document, gets the nonce.
  return applyCsp(request, (init) => NextResponse.next(init), true);
}

export const config = {
  // Run on `/`, `/login`, and every `/dashboard/*` route. Static assets and the
  // Next internals are excluded so the proxy doesn't pay the cost on every chunk.
  matcher: ["/", "/login", "/dashboard/:path*"],
};
