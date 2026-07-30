import type { NextConfig } from "next";
import path from "node:path";

// Deployment branches pin their backend URL so a Vercel project-level value
// cannot accidentally point this build at another environment. Local dev still
// honors NEXT_PUBLIC_API_URL from .env.local.
const apiUrl =
  process.env.NODE_ENV === "production"
    ? "https://api.athlits.app"
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080");

// Static security headers applied to every response. The Content-Security-Policy
// is deliberately NOT here — it needs a per-request nonce, so it lives in
// `src/proxy.ts` (middleware). These headers have no per-request part.
const securityHeaders = [
  // Force HTTPS for two years. Vercel always serves HTTPS, so this is safe.
  // `preload` is intentionally omitted (it's a hard-to-reverse commitment).
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // Clickjacking: refuse to be framed at all. CSP `frame-ancestors 'none'`
  // (set in the proxy) is the modern equivalent; this covers older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  // Stop browsers from MIME-sniffing a response into a different content type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak full URLs (which can carry the ?from= path) to other origins.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable powerful features we don't use. Venue coordinates are now entered
  // manually, so geolocation is fully disabled too.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: apiUrl,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    // Venue cover URLs come from the backend at runtime, so we can't enumerate
    // exact hosts at build time. Locked to HTTPS to refuse plaintext sources.
    // NOTE: this wildcard also makes /_next/image a generic image proxy. To
    // tighten it safely we need the actual host(s) cover images are served from
    // (e.g. an S3/CDN domain) — see the security report.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
