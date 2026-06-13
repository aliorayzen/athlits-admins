"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

// App Router error boundary. Catches errors thrown during rendering of any
// /dashboard/* segment. Must be a Client Component per Next.js convention.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production, replace with a real logger (Sentry, etc).
    // The digest is the only safe way to correlate this client error with
    // server logs when Next has stripped the message in production.
    console.error("[dashboard error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-[14px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))] p-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-[rgba(244,63,94,0.26)] bg-[rgba(244,63,94,0.08)] text-[#fda4af]">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="mb-2 text-lg font-semibold tracking-[-0.01em] text-[var(--text-1)]">
          Something went wrong loading this page
        </h2>
        <p className="mb-6 text-sm text-[var(--text-3)]">
          {error.message ||
            "An unexpected error occurred. You can try again, and if the problem persists, contact support."}
        </p>
        {error.digest && (
          <p className="mb-6 font-mono text-[11px] text-[var(--text-4)]">
            Error id: {error.digest}
          </p>
        )}
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border-strong)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm font-medium text-[var(--text-1)] transition-all hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.06)]"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Try again
        </button>
      </div>
    </div>
  );
}
