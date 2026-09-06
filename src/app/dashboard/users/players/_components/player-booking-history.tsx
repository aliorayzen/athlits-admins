"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronUp,
  Copy,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getAdminPlayerBookings, getApiErrorMessage, getVenues } from "@/lib/api";
import type {
  PageResponse,
  PlayerBookingGroup,
  PlayerBookingHistoryQuery,
  PlayerReportItem,
  SortDirection,
  VenueSummaryResponse,
} from "@/types/api";

import {
  formatDateTime,
  humanize,
  MoneyList,
  Pagination,
  StatusPill,
} from "./player-report-primitives";

const HISTORY_PAGE_SIZE = 20;
const RESERVATION_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;
const PAYMENT_STATUSES = [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
] as const;

interface HistoryFilters {
  from: string;
  to: string;
  reservationStatus: string[];
  paymentStatus: string[];
  venueId: string;
  direction: SortDirection;
}

const EMPTY_HISTORY_FILTERS: HistoryFilters = {
  from: "",
  to: "",
  reservationStatus: [],
  paymentStatus: [],
  venueId: "",
  direction: "DESC",
};

export function PlayerBookingHistory({
  player,
  onClose,
}: {
  player: PlayerReportItem;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(EMPTY_HISTORY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_HISTORY_FILTERS);
  const [page, setPage] = useState(0);
  const [data, setData] =
    useState<PageResponse<PlayerBookingGroup> | null>(null);
  const [venues, setVenues] = useState<VenueSummaryResponse[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const requestSequence = useRef(0);
  const hasLoadedOnce = useRef(false);

  const query = useMemo<PlayerBookingHistoryQuery>(
    () => ({
      from: filters.from || undefined,
      to: filters.to || undefined,
      reservationStatus:
        filters.reservationStatus.length > 0
          ? filters.reservationStatus
          : undefined,
      paymentStatus:
        filters.paymentStatus.length > 0 ? filters.paymentStatus : undefined,
      venueId: filters.venueId || undefined,
      direction: filters.direction,
      page,
      size: HISTORY_PAGE_SIZE,
    }),
    [filters, page],
  );

  useEffect(() => {
    void getVenues()
      .then(setVenues)
      .catch(() => setVenues([]));
  }, []);

  useEffect(() => {
    const sequence = ++requestSequence.current;

    async function load() {
      setIsFetching(true);
      if (!hasLoadedOnce.current) setIsLoading(true);
      try {
        const response = await getAdminPlayerBookings(player.playerId, query);
        if (sequence !== requestSequence.current) return;
        setData(response);
        setError("");
        hasLoadedOnce.current = true;
      } catch (loadError: unknown) {
        if (sequence !== requestSequence.current) return;
        setError(
          getApiErrorMessage(
            loadError,
            "Couldn't load this player's booking history.",
          ),
        );
      } finally {
        if (sequence === requestSequence.current) {
          setIsLoading(false);
          setIsFetching(false);
        }
      }
    }

    void load();
  }, [player.playerId, query, reloadToken]);

  const fullName = `${player.firstName} ${player.lastName}`.trim() || player.email;

  function applyFilters() {
    if (draft.from && draft.to && draft.from > draft.to) {
      toast.error("Booking start date must be before the end date.");
      return;
    }
    setFilters({ ...draft });
    setPage(0);
  }

  function clearFilters() {
    setDraft(EMPTY_HISTORY_FILTERS);
    setFilters(EMPTY_HISTORY_FILTERS);
    setPage(0);
  }

  return (
    <section
      aria-labelledby="player-history-title"
      className="overflow-hidden rounded-lg border border-[rgba(0,212,170,0.18)] bg-[var(--bg-1)] shadow-[0_0_28px_-18px_rgba(0,212,170,0.35)]"
    >
      <header className="flex flex-col gap-3 border-b border-[var(--border)] px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[var(--teal-text)]" />
            <h2
              id="player-history-title"
              className="truncate text-[16px] font-semibold tracking-[-0.01em] text-[var(--text-1)]"
            >
              {fullName}
            </h2>
            <span className="font-mono text-[10.5px] text-[var(--text-4)]">
              #{player.playerId}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-[var(--text-3)]">
            Grouped reservation history. Currency totals remain separate.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Refresh booking history"
            disabled={isFetching}
            onClick={() => setReloadToken((token) => token + 1)}
            className="h-8 w-8 text-[var(--text-3)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]"
          >
            <RefreshCw className={isFetching ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close booking history"
            onClick={onClose}
            className="h-8 w-8 text-[var(--text-3)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <HistoryFilterBar
        draft={draft}
        filters={filters}
        venues={venues}
        onDraft={setDraft}
        onApply={applyFilters}
        onClear={clearFilters}
      />

      {error && data && (
        <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-md border border-[rgba(245,158,11,0.2)] bg-[var(--semantic-amber-subtle)] px-3 py-2.5">
          <span className="flex min-w-0 items-center gap-2 text-[12px] text-[var(--text-2)]">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[var(--semantic-amber)]" />
            <span className="truncate">{error}</span>
          </span>
          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            className="text-[11.5px] font-medium text-[var(--semantic-amber)] hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      <HistoryBody
        data={data}
        error={error}
        isLoading={isLoading}
        isFetching={isFetching}
        onRetry={() => setReloadToken((token) => token + 1)}
        onPage={setPage}
      />
    </section>
  );
}

function HistoryFilterBar({
  draft,
  filters,
  venues,
  onDraft,
  onApply,
  onClear,
}: {
  draft: HistoryFilters;
  filters: HistoryFilters;
  venues: VenueSummaryResponse[];
  onDraft: React.Dispatch<React.SetStateAction<HistoryFilters>>;
  onApply: () => void;
  onClear: () => void;
}) {
  const filtered = Object.entries(filters).some(
    ([key, value]) =>
      key !== "direction" &&
      (Array.isArray(value) ? value.length > 0 : value !== ""),
  );
  const inputClass =
    "h-8 rounded-md border border-[var(--border)] bg-[var(--bg-0)] px-2 text-[11.5px] text-[var(--text-2)] outline-none focus:border-[var(--teal)] focus:ring-[3px] focus:ring-[var(--teal-subtle)]";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
      className="grid gap-2 border-b border-[var(--border)] bg-white/[0.008] px-4 py-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_1.2fr_auto]"
    >
      <LabeledControl label="From" htmlFor="history-from">
        <input
          id="history-from"
          type="date"
          value={draft.from}
          max={draft.to || undefined}
          onChange={(event) =>
            onDraft((current) => ({ ...current, from: event.target.value }))
          }
          className={inputClass}
        />
      </LabeledControl>
      <LabeledControl label="To" htmlFor="history-to">
        <input
          id="history-to"
          type="date"
          value={draft.to}
          min={draft.from || undefined}
          onChange={(event) =>
            onDraft((current) => ({ ...current, to: event.target.value }))
          }
          className={inputClass}
        />
      </LabeledControl>
      <LabeledControl label="Reservation" htmlFor="history-reservation-status">
        <MultiStatusFilter
          id="history-reservation-status"
          label="reservation statuses"
          options={RESERVATION_STATUSES}
          values={draft.reservationStatus}
          onChange={(reservationStatus) =>
            onDraft((current) => ({ ...current, reservationStatus }))
          }
        />
      </LabeledControl>
      <LabeledControl label="Payment" htmlFor="history-payment-status">
        <MultiStatusFilter
          id="history-payment-status"
          label="payment statuses"
          options={PAYMENT_STATUSES}
          values={draft.paymentStatus}
          onChange={(paymentStatus) =>
            onDraft((current) => ({ ...current, paymentStatus }))
          }
        />
      </LabeledControl>
      <LabeledControl label="Venue" htmlFor="history-venue">
        <select
          id="history-venue"
          value={draft.venueId}
          onChange={(event) =>
            onDraft((current) => ({ ...current, venueId: event.target.value }))
          }
          className={inputClass}
        >
          <option value="">All venues</option>
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
      </LabeledControl>
      <div className="flex items-end gap-1.5">
        <button
          type="button"
          aria-label={`Sort ${draft.direction === "DESC" ? "oldest first" : "newest first"}`}
          title={draft.direction === "DESC" ? "Newest first" : "Oldest first"}
          onClick={() =>
            onDraft((current) => ({
              ...current,
              direction: current.direction === "DESC" ? "ASC" : "DESC",
            }))
          }
          className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-3)] hover:border-[var(--border-strong)] hover:text-[var(--text-1)]"
        >
          <ChevronUp
            className={`h-3.5 w-3.5 transition-transform ${draft.direction === "DESC" ? "rotate-180" : ""}`}
          />
        </button>
        <Button
          type="submit"
          className="h-8 bg-[var(--teal)] px-3 text-[11.5px] font-semibold text-[#032921] hover:bg-[var(--teal)] hover:brightness-110"
        >
          Apply
        </Button>
        {filtered && (
          <Button
            type="button"
            variant="ghost"
            onClick={onClear}
            className="h-8 px-2 text-[11.5px] text-[var(--text-3)]"
          >
            Clear
          </Button>
        )}
      </div>
    </form>
  );
}

function MultiStatusFilter({
  id,
  label,
  options,
  values,
  onChange,
}: {
  id: string;
  label: string;
  options: readonly string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={(props) => (
          <button
            {...props}
            id={id}
            type="button"
            aria-label={`Filter by ${label}`}
            className="flex h-8 w-full items-center rounded-md border border-[var(--border)] bg-[var(--bg-0)] px-2 text-left text-[11.5px] text-[var(--text-2)] outline-none hover:border-[var(--border-strong)] focus-visible:border-[var(--teal)] focus-visible:ring-[3px] focus-visible:ring-[var(--teal-subtle)]"
          >
            {values.length === 0
              ? "Any status"
              : values.length === 1
                ? humanize(values[0])
                : `${values.length} statuses`}
          </button>
        )}
      />
      <PopoverContent
        align="start"
        className="w-52 border-[var(--border)] bg-[var(--bg-1)] p-2"
      >
        <div className="space-y-0.5">
          {options.map((option) => (
            <label
              key={option}
              htmlFor={`${id}-${option}`}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] text-[var(--text-2)] hover:bg-[var(--bg-2)]"
            >
              <Checkbox
                id={`${id}-${option}`}
                checked={values.includes(option)}
                onCheckedChange={() =>
                  onChange(
                    values.includes(option)
                      ? values.filter((value) => value !== option)
                      : [...values, option],
                  )
                }
              />
              {humanize(option)}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function LabeledControl({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label
        htmlFor={htmlFor}
        className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function HistoryBody({
  data,
  error,
  isLoading,
  isFetching,
  onRetry,
  onPage,
}: {
  data: PageResponse<PlayerBookingGroup> | null;
  error: string;
  isLoading: boolean;
  isFetching: boolean;
  onRetry: () => void;
  onPage: (page: number) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid min-h-48 place-items-center text-[12px] text-[var(--text-3)]">
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--teal-text)]" />
          Loading booking history
        </span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="grid min-h-48 place-items-center px-4 text-center">
        <div>
          <AlertTriangle className="mx-auto h-5 w-5 text-[var(--semantic-red)]" />
          <p className="mt-2 text-[13px] text-[var(--text-2)]">{error}</p>
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
            className="mt-3 h-8 border-[var(--border)] bg-[var(--bg-2)] text-[12px]"
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!data || data.content.length === 0) {
    return (
      <div className="grid min-h-44 place-items-center px-4 text-center">
        <div>
          <CalendarDays className="mx-auto h-5 w-5 text-[var(--text-4)]" />
          <p className="mt-2 text-[13px] font-medium text-[var(--text-2)]">
            No grouped bookings found
          </p>
          <p className="mt-1 text-[11.5px] text-[var(--text-4)]">
            Adjust the history filters to widen the result set.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] border-separate border-spacing-0">
          <thead>
            <tr>
              {[
                "Date and reservation",
                "Venue",
                "Sessions",
                "Reservation status",
                "Payment",
                "Total",
                "Paid amounts",
              ].map((heading) => (
                <th
                  key={heading}
                  className="border-b border-[var(--border)] px-4 py-2.5 text-left text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.content.map((booking) => (
              <BookingRow key={booking.reservationId} booking={booking} />
            ))}
          </tbody>
        </table>
      </div>
      <Pagination data={data} disabled={isFetching} onPage={onPage} />
    </div>
  );
}

function BookingRow({ booking }: { booking: PlayerBookingGroup }) {
  return (
    <tr className="hover:bg-white/[0.015]">
      <td className="border-t border-white/[0.035] px-4 py-3 align-top">
        <div className="whitespace-nowrap text-[12px] font-medium text-[var(--text-2)]">
          {formatDateTime(booking.startAt)}
        </div>
        <button
          type="button"
          title="Copy reservation ID"
          onClick={() => {
            void navigator.clipboard.writeText(booking.reservationId);
            toast.success("Reservation ID copied");
          }}
          className="mt-1 inline-flex max-w-44 items-center gap-1 font-mono text-[9.5px] text-[var(--text-4)] hover:text-[var(--teal-text)]"
        >
          <span className="truncate">{booking.reservationId}</span>
          <Copy className="h-2.5 w-2.5 shrink-0" />
        </button>
      </td>
      <td className="border-t border-white/[0.035] px-4 py-3 align-top">
        <div className="text-[12px] font-medium text-[var(--text-2)]">
          {booking.venueName}
        </div>
        <div className="mt-0.5 text-[10.5px] text-[var(--text-4)]">
          {booking.courtName}
        </div>
      </td>
      <td className="border-t border-white/[0.035] px-4 py-3 align-top">
        <div className="font-mono text-[12px] tabular-nums text-[var(--text-2)]">
          {booking.sessionsCount} {booking.sessionsCount === 1 ? "session" : "sessions"}
        </div>
        <div className="mt-0.5 font-mono text-[10.5px] text-[var(--text-4)]">
          {booking.durationMinutes} min
        </div>
      </td>
      <td className="border-t border-white/[0.035] px-4 py-3 align-top">
        <StatusPill status={booking.overallStatus} />
        <div className="mt-1.5 flex max-w-52 flex-wrap gap-1">
          {booking.statuses.map((status) => (
            <span key={status} className="text-[9.5px] text-[var(--text-4)]">
              {humanize(status)}
            </span>
          ))}
        </div>
      </td>
      <td className="border-t border-white/[0.035] px-4 py-3 align-top">
        <StatusPill status={booking.paid ? "PAID" : "UNPAID"} />
        <div className="mt-1.5 text-[9.5px] text-[var(--text-4)]">
          {[...booking.paymentStatuses, ...booking.paymentMethods]
            .map(humanize)
            .join(" · ") || "No payment activity"}
        </div>
      </td>
      <td className="border-t border-white/[0.035] px-4 py-3 align-top">
        <MoneyList amounts={booking.totalAmounts} />
      </td>
      <td className="border-t border-white/[0.035] px-4 py-3 align-top">
        <div className="text-[9.5px] font-semibold uppercase tracking-[0.07em] text-[var(--text-4)]">
          Net
        </div>
        <MoneyList amounts={booking.netPaid} />
        <div className="mt-1.5 text-[9.5px] text-[var(--text-4)]">Gross</div>
        <MoneyList amounts={booking.grossPaid} muted />
      </td>
    </tr>
  );
}
