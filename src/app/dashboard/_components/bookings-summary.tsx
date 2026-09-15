"use client";

import { CalendarRange, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { getAdminBookings, getApiErrorMessage } from "@/lib/api";
import type {
  AdminBookingStatus,
  AdminBookingsSummary,
  VenueSummaryResponse,
} from "@/types/api";
import { cn } from "@/lib/utils";

/** Preset windows, expressed in days back from today. `0` means "today". */
const RANGES = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
] as const;

const STATUSES: { key: "ALL" | AdminBookingStatus; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PENDING", label: "Pending" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "COMPLETED", label: "Completed" },
];

const isoDate = (daysBack: number) =>
  new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 10);

/**
 * Booking volume for a filtered window.
 *
 * The backend already aggregates this: `/bookings` returns a `summary` beside
 * the page of rows, so the filters are sent to the server rather than counting
 * a client-side page and reporting a number that only covers the first 20 rows.
 */
export function BookingsSummary({
  venues,
}: {
  venues: VenueSummaryResponse[];
}) {
  const [rangeKey, setRangeKey] =
    useState<(typeof RANGES)[number]["key"]>("30");
  const [status, setStatus] = useState<"ALL" | AdminBookingStatus>("ALL");
  const [venueId, setVenueId] = useState<string>("ALL");
  const [summary, setSummary] = useState<AdminBookingsSummary | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const venueSelectId = useId();

  // Bumped by Refresh to re-run the effect without a filter having changed.
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    // Guards against a slow earlier request resolving after a newer one and
    // overwriting the summary with counts for filters no longer on screen.
    let cancelled = false;
    const days = RANGES.find((r) => r.key === rangeKey)?.days ?? 30;

    async function run() {
      try {
        const result = await getAdminBookings({
          from: isoDate(days),
          to: isoDate(0),
          ...(status !== "ALL" ? { status } : {}),
          ...(venueId !== "ALL" ? { venueId: Number(venueId) } : {}),
          size: 1,
        });
        if (cancelled) return;
        setSummary(result.summary);
        setPhase("ready");
      } catch (err: unknown) {
        if (cancelled) return;
        setError(getApiErrorMessage(err, "Couldn't load bookings."));
        setPhase("error");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [rangeKey, status, venueId, reloadToken]);

  /**
   * Filter changes own the spinner. Setting it here rather than at the top of
   * the effect keeps the effect free of synchronous state writes, which is both
   * the lint rule and the reason the old version could flash stale counts.
   */
  function applyFilter(change: () => void) {
    setPhase("loading");
    setError("");
    change();
  }

  const refresh = () => applyFilter(() => setReloadToken((n) => n + 1));

  const total = summary?.totalBookings ?? 0;
  const counts = summary?.countsByStatus ?? {};

  return (
    <section className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-1)] p-5">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-1)]">
            <CalendarRange className="h-4 w-4 text-[var(--teal-text)]" />
            Bookings
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--text-3)]">
            Totals for the selected window, counted server-side.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={phase === "loading"}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-1)] px-2.5 py-1.5 text-[12px] text-[var(--text-2)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)] disabled:opacity-60"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", phase === "loading" && "animate-spin")}
          />
          Refresh
        </button>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterChips
          ariaLabel="Date range"
          options={RANGES.map((r) => ({ key: r.key, label: r.label }))}
          value={rangeKey}
          onChange={(next) =>
            applyFilter(() =>
              setRangeKey(next as (typeof RANGES)[number]["key"]),
            )
          }
        />
        <span className="h-4 w-px bg-[var(--border)]" aria-hidden="true" />
        <FilterChips
          ariaLabel="Booking status"
          options={STATUSES}
          value={status}
          onChange={(next) =>
            applyFilter(() => setStatus(next as "ALL" | AdminBookingStatus))
          }
        />
        <label htmlFor={venueSelectId} className="sr-only">
          Filter by venue
        </label>
        <select
          id={venueSelectId}
          value={venueId}
          onChange={(event) => {
            const next = event.target.value;
            applyFilter(() => setVenueId(next));
          }}
          className="ml-auto h-8 rounded-md border border-[var(--border)] bg-[var(--bg-1)] px-2 text-[12px] text-[var(--text-2)] outline-none transition-colors hover:border-[var(--border-strong)] focus:border-[var(--teal)]"
        >
          <option value="ALL">All venues</option>
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
      </div>

      {phase === "error" ? (
        <p className="py-6 text-center text-[13px] text-[var(--red-text)]">
          {error}
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
              Total bookings
            </p>
            <p className="mt-1 flex items-center gap-2 text-[30px] font-semibold leading-none tabular-nums text-[var(--text-1)]">
              {phase === "loading" ? (
                <Loader2 className="h-6 w-6 animate-spin text-[var(--text-4)]" />
              ) : (
                total.toLocaleString()
              )}
            </p>
          </div>

          {phase === "ready" && total > 0 && (
            <dl className="flex flex-wrap gap-x-6 gap-y-2">
              {STATUSES.filter((s) => s.key !== "ALL").map((s) => (
                <div key={s.key}>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
                    {s.label}
                  </dt>
                  <dd className="mt-0.5 font-mono text-[15px] tabular-nums text-[var(--text-2)]">
                    {(
                      counts[s.key as AdminBookingStatus] ?? 0
                    ).toLocaleString()}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {phase === "ready" && total === 0 && (
            <p className="text-[13px] text-[var(--text-3)]">
              No bookings match these filters.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function FilterChips({
  ariaLabel,
  options,
  value,
  onChange,
}: {
  ariaLabel: string;
  options: readonly { key: string; label: string }[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-2)] p-0.5"
    >
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.key)}
            className={cn(
              "rounded px-2.5 py-1 text-[12px] transition-colors",
              selected
                ? "bg-[var(--bg-1)] font-medium text-[var(--text-1)] shadow-[var(--shadow-1)]"
                : "text-[var(--text-3)] hover:text-[var(--text-1)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
