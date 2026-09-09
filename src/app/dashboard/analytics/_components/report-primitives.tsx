"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { storeFreshness } from "@/lib/store-analytics";

export function useStoreReport<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<{ data?: T; error?: string }>({});
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            error:
              getApiErrorStatus(error) === 403
                ? "Access denied. Store analytics requires the ADMIN role."
                : getApiErrorMessage(
                    error,
                    "Couldn't load this report. Please retry.",
                  ),
          });
      },
    );
    return () => controller.abort();
  }, [load]);
  return state;
}

export function ReportSection({
  title,
  error,
  loading,
  children,
}: {
  title: string;
  error?: string;
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className="space-y-4 border-t border-[var(--border)] pt-6"
      aria-label={title}
      aria-busy={loading}
    >
      <h3 className="text-base font-semibold text-[var(--text-1)]">{title}</h3>
      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-[var(--semantic-red-subtle)] p-4 text-sm text-[var(--semantic-red)]"
        >
          {error}
        </p>
      ) : loading ? (
        <div role="status" className="space-y-3">
          <span className="sr-only">Loading {title}</span>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        children
      )}
    </section>
  );
}

export function Freshness({ date }: { date?: string }) {
  return <p className="text-xs text-[var(--text-3)]">{storeFreshness(date)}</p>;
}

export function EmptyReport({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg bg-[var(--bg-2)] p-5 text-sm leading-6 text-[var(--text-3)]">
      {children}
    </p>
  );
}
