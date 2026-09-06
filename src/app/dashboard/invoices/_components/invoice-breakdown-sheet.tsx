"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Hash,
  ReceiptText,
  RefreshCw,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getApiErrorMessage, getInvoiceBreakdown } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  InvoiceBreakdownCharge,
  InvoiceBreakdownPeriod,
  InvoiceBreakdownResponse,
  InvoiceResponse,
} from "@/types/api";

const PAGE_SIZE = 20;

function formatMoney(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

function formatDate(date: string): string {
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value: string): string {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function durationLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
}

function feeModelLabel(feeModel: InvoiceBreakdownPeriod["feeModel"]): string {
  return feeModel === "FIXED_MONTHLY" ? "Fixed monthly" : "Per reservation";
}

function prorationLabel(proration: number): string {
  const percentage = proration <= 1 ? proration * 100 : proration;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(percentage)}% proration`;
}

interface InvoiceBreakdownSheetProps {
  invoice: InvoiceResponse | null;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceBreakdownSheet({
  invoice,
  onOpenChange,
}: InvoiceBreakdownSheetProps) {
  const [page, setPage] = useState(0);
  const [breakdown, setBreakdown] =
    useState<InvoiceBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!invoice) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    try {
      const result = await getInvoiceBreakdown(invoice.id, {
        page,
        size: PAGE_SIZE,
      });
      if (requestId === requestIdRef.current) setBreakdown(result);
    } catch (err: unknown) {
      if (requestId === requestIdRef.current) {
        setError(getApiErrorMessage(err, "Could not load invoice breakdown."));
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [invoice, page]);

  useEffect(() => {
    if (!invoice) {
      requestIdRef.current += 1;
      setPage(0);
      setBreakdown(null);
      setError("");
      return;
    }
    void load();
  }, [invoice, load]);

  const periodTotal = useMemo(
    () => breakdown?.periods.reduce((sum, period) => sum + period.subtotal, 0) ?? 0,
    [breakdown],
  );
  const reconciles = breakdown
    ? Math.abs(periodTotal - breakdown.amountDue) < 0.005
    : false;
  const shortId = invoice?.id.slice(0, 8).toUpperCase() ?? "";

  return (
    <Sheet open={invoice !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        aria-label={invoice ? `Invoice ${shortId} charge breakdown` : undefined}
        className="w-[calc(100%-0.75rem)] gap-0 border-[var(--border)] bg-[var(--bg-1)] sm:w-[min(880px,calc(100%-2rem))] sm:max-w-[880px]"
      >
        {invoice && (
          <>
            <SheetHeader className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md border border-[rgba(0,212,170,0.2)] bg-[var(--teal-subtle)] text-[var(--teal-text)]">
                    <ReceiptText className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <SheetTitle className="text-[15px] font-semibold text-[var(--text-1)]">
                      Charge breakdown
                    </SheetTitle>
                    <SheetDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-[var(--text-3)]">
                      <span className="font-mono text-[var(--text-2)]">
                        #{shortId}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">
                        {invoice.venueName ?? invoice.venueId}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Stored billing evidence</span>
                    </SheetDescription>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Close charge breakdown"
                  className="grid size-8 shrink-0 place-items-center rounded-md border border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-3)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto" aria-busy={loading}>
              {!breakdown && loading ? (
                <BreakdownSkeleton />
              ) : error && !breakdown ? (
                <LoadError message={error} onRetry={() => void load()} />
              ) : breakdown ? (
                <div className="space-y-7 px-5 py-5 sm:px-6">
                  {!breakdown.detailAvailable ? (
                    <UnavailableState reason={breakdown.detailUnavailableReason} />
                  ) : (
                    <>
                      <ReconciliationSummary
                        breakdown={breakdown}
                        periodTotal={periodTotal}
                        reconciles={reconciles}
                      />
                      <PeriodsSection periods={breakdown.periods} />
                      <ChargesSection
                        breakdown={breakdown}
                        loading={loading}
                        invoiceVenue={invoice.venueName ?? invoice.venueId}
                      />
                    </>
                  )}
                  {error && breakdown && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-[rgba(245,158,11,0.25)] bg-[var(--semantic-amber-subtle)] px-3 py-2.5 text-[12px] text-[var(--semantic-amber)]">
                      <span>{error}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void load()}
                      >
                        <RefreshCw /> Retry
                      </Button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {breakdown?.detailAvailable && (
              <BreakdownPagination
                breakdown={breakdown}
                loading={loading}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ReconciliationSummary({
  breakdown,
  periodTotal,
  reconciles,
}: {
  breakdown: InvoiceBreakdownResponse;
  periodTotal: number;
  reconciles: boolean;
}) {
  const difference = breakdown.amountDue - periodTotal;
  return (
    <section
      aria-label="Invoice reconciliation"
      className="grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-0)] px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-end"
    >
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-4)]">
          Invoice total
        </p>
        <p className="mt-1 font-mono text-[24px] font-semibold tracking-[-0.04em] text-[var(--text-1)] tabular-nums">
          {formatMoney(breakdown.amountDue, breakdown.currencyCode)}
        </p>
        <p className="mt-1 text-[11.5px] text-[var(--text-3)]">
          Historical amounts captured when this invoice was generated.
        </p>
      </div>
      <div
        className={cn(
          "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
          reconciles
            ? "border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.08)] text-[var(--semantic-green)]"
            : "border-[rgba(245,158,11,0.22)] bg-[var(--semantic-amber-subtle)] text-[var(--semantic-amber)]",
        )}
      >
        {reconciles ? (
          <>
            <CheckCircle2 className="size-3" /> Periods reconcile
          </>
        ) : (
          <>
            <AlertCircle className="size-3" /> Difference {formatMoney(difference, breakdown.currencyCode)}
          </>
        )}
      </div>
    </section>
  );
}

function PeriodsSection({ periods }: { periods: InvoiceBreakdownPeriod[] }) {
  return (
    <section aria-labelledby="breakdown-periods-heading">
      <div className="mb-2.5 flex items-end justify-between gap-3">
        <div>
          <h3
            id="breakdown-periods-heading"
            className="text-[13px] font-semibold text-[var(--text-1)]"
          >
            Contract periods
          </h3>
          <p className="mt-0.5 text-[11px] text-[var(--text-3)]">
            Rates and proration applied to each covered period.
          </p>
        </div>
        <span className="font-mono text-[10.5px] text-[var(--text-4)]">
          {periods.length} {periods.length === 1 ? "period" : "periods"}
        </span>
      </div>

      {periods.length === 0 ? (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--bg-0)] px-4 py-5 text-center text-[12px] text-[var(--text-3)]">
          No contract-period snapshots were returned.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead className="bg-[var(--bg-2)] text-[10px] uppercase tracking-[0.07em] text-[var(--text-4)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Contract</th>
                  <th className="px-3 py-2 font-medium">Coverage</th>
                  <th className="px-3 py-2 font-medium">Fee model</th>
                  <th className="px-3 py-2 text-right font-medium">Rate</th>
                  <th className="px-3 py-2 text-right font-medium">Units</th>
                  <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr
                    key={`${period.contractId}-${period.servicePeriodStart}-${period.feeModel}`}
                    className="border-t border-[var(--border)] bg-[var(--bg-1)]"
                  >
                    <td className="px-3 py-3 align-top font-mono text-[11px] text-[var(--text-2)]">
                      #{period.contractId}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <p className="whitespace-nowrap text-[11.5px] text-[var(--text-2)]">
                        {formatDate(period.servicePeriodStart)} to {formatDate(period.servicePeriodEnd)}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-[var(--text-4)]">
                        {period.coveredDays}/{period.daysInMonth} days
                      </p>
                    </td>
                    <td className="px-3 py-3 align-top text-[11.5px] text-[var(--text-2)]">
                      {feeModelLabel(period.feeModel)}
                    </td>
                    <td className="px-3 py-3 text-right align-top font-mono text-[11.5px] text-[var(--text-2)] tabular-nums">
                      {formatMoney(period.rate, period.currencyCode)}
                    </td>
                    <td className="px-3 py-3 text-right align-top">
                      <p className="font-mono text-[11.5px] text-[var(--text-2)] tabular-nums">
                        {period.billingUnits}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[var(--text-4)]">
                        {period.totalBookings} bookings
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right align-top font-mono text-[12px] font-semibold text-[var(--text-1)] tabular-nums">
                      {formatMoney(period.subtotal, period.currencyCode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function ChargesSection({
  breakdown,
  loading,
  invoiceVenue,
}: {
  breakdown: InvoiceBreakdownResponse;
  loading: boolean;
  invoiceVenue: string;
}) {
  const charges = breakdown.charges.content;
  return (
    <section aria-labelledby="breakdown-charges-heading">
      <div className="mb-2.5 flex items-end justify-between gap-3">
        <div>
          <h3
            id="breakdown-charges-heading"
            className="text-[13px] font-semibold text-[var(--text-1)]"
          >
            Charged items
          </h3>
          <p className="mt-0.5 text-[11px] text-[var(--text-3)]">
            Courts and grouped reservations included in the invoice.
          </p>
        </div>
        <span className="font-mono text-[10.5px] text-[var(--text-4)]">
          {breakdown.charges.totalElements} total
        </span>
      </div>

      {charges.length === 0 ? (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--bg-0)] px-4 py-5 text-center text-[12px] text-[var(--text-3)]">
          No charge snapshots were returned for this page.
        </p>
      ) : (
        <div
          className={cn(
            "overflow-hidden rounded-lg border border-[var(--border)] transition-opacity",
            loading && "opacity-55",
          )}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead className="bg-[var(--bg-2)] text-[10px] uppercase tracking-[0.07em] text-[var(--text-4)]">
                <tr>
                  <th className="w-8 px-2 py-2 font-medium">
                    <span className="sr-only">Expand</span>
                  </th>
                  <th className="px-2 py-2 font-medium">Charge</th>
                  <th className="px-3 py-2 font-medium">Court</th>
                  <th className="px-3 py-2 font-medium">Billing basis</th>
                  <th className="px-3 py-2 text-right font-medium">Rate</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {charges.map((charge) => (
                  <ChargeRows
                    key={charge.id}
                    charge={charge}
                    periods={breakdown.periods}
                    invoiceVenue={invoiceVenue}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function ChargeRows({
  charge,
  periods,
  invoiceVenue,
}: {
  charge: InvoiceBreakdownCharge;
  periods: InvoiceBreakdownPeriod[];
  invoiceVenue: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isReservation = charge.type === "RESERVATION";
  const hasSessions = isReservation && charge.sessions.length > 0;
  const period =
    periods.find((candidate) => candidate.contractId === charge.contractId) ??
    (periods.length === 1 ? periods[0] : undefined);
  const coveredDays = charge.coveredDays ?? period?.coveredDays;
  const daysInMonth = charge.daysInMonth ?? period?.daysInMonth;
  const servicePeriodStart =
    charge.servicePeriodStart ?? period?.servicePeriodStart;
  const servicePeriodEnd = charge.servicePeriodEnd ?? period?.servicePeriodEnd;
  const courtName = charge.courtName ?? `Court #${charge.courtId}`;
  const reservationLabel = charge.reservationId
    ? charge.reservationId.length > 16
      ? `${charge.reservationId.slice(0, 8)}…${charge.reservationId.slice(-4)}`
      : charge.reservationId
    : `Charge #${charge.id}`;

  return (
    <Fragment>
      <tr className="border-t border-[var(--border)] bg-[var(--bg-1)] hover:bg-white/[0.015]">
        <td className="px-2 py-3 align-middle">
          {hasSessions ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
              aria-label={`${expanded ? "Collapse" : "Expand"} reservation ${charge.reservationId ?? charge.id}`}
              className="grid size-7 place-items-center rounded-md text-[var(--text-3)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--text-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]"
            >
              <ChevronDown
                className={cn(
                  "size-3.5 transition-transform duration-200",
                  expanded && "rotate-180",
                )}
              />
            </button>
          ) : null}
        </td>
        <td className="px-2 py-3 align-middle">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-[9.5px] font-semibold tracking-[0.04em]",
                isReservation
                  ? "bg-[rgba(99,102,241,0.1)] text-[var(--semantic-blue)]"
                  : "bg-[var(--teal-subtle)] text-[var(--teal-text)]",
              )}
            >
              {isReservation ? "RESERVATION" : "COURT"}
            </span>
            <span
              className="max-w-[150px] truncate font-mono text-[10.5px] text-[var(--text-4)]"
              title={charge.reservationId ?? charge.id}
            >
              {isReservation ? reservationLabel : `#${charge.id}`}
            </span>
          </div>
        </td>
        <td className="px-3 py-3 align-middle">
          <p className="text-[11.5px] font-medium text-[var(--text-1)]">
            {courtName}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[var(--text-4)]">
            Court ID {charge.courtId}
          </p>
        </td>
        <td className="px-3 py-3 align-middle">
          {isReservation ? (
            <>
              <p className="font-mono text-[11px] text-[var(--text-2)] tabular-nums">
                {durationLabel(charge.combinedDurationMinutes ?? 0)} → {charge.billingUnits ?? 0} units
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--text-4)]">
                {charge.sessions.length} {charge.sessions.length === 1 ? "session" : "sessions"} grouped
              </p>
            </>
          ) : (
            <>
              <p className="text-[11px] text-[var(--text-2)]">1 monthly court</p>
              {servicePeriodStart && servicePeriodEnd && (
                <p className="mt-0.5 whitespace-nowrap text-[10px] text-[var(--text-4)]">
                  {formatDate(servicePeriodStart)} to {formatDate(servicePeriodEnd)}
                </p>
              )}
              {coveredDays !== undefined && daysInMonth !== undefined && (
                <p className="mt-0.5 font-mono text-[10px] text-[var(--text-4)]">
                  {coveredDays}/{daysInMonth} covered days
                </p>
              )}
              {charge.proration !== null && charge.proration !== undefined && (
                <p className="mt-0.5 font-mono text-[10px] text-[var(--text-4)]">
                  {prorationLabel(charge.proration)}
                </p>
              )}
            </>
          )}
        </td>
        <td className="px-3 py-3 text-right align-middle font-mono text-[11.5px] text-[var(--text-2)] tabular-nums">
          {formatMoney(charge.rate, charge.currencyCode)}
        </td>
        <td className="px-3 py-3 text-right align-middle font-mono text-[12px] font-semibold text-[var(--text-1)] tabular-nums">
          {formatMoney(charge.amount, charge.currencyCode)}
        </td>
      </tr>
      {hasSessions && expanded && (
        <tr className="border-t border-[var(--border)] bg-[var(--bg-0)]">
          <td colSpan={6} className="px-4 py-3 sm:px-7">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[var(--text-4)]">
                Reservation sessions
              </p>
              <span className="text-[10.5px] text-[var(--text-3)]">
                {charge.venueName ?? invoiceVenue} · {courtName}
              </span>
            </div>
            <div className="space-y-1.5">
              {charge.sessions.map((session) => (
                <div
                  key={session.bookingId}
                  className="grid gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-1)] px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-2)]">
                      <CalendarDays className="size-3 text-[var(--text-4)]" />
                      {formatDate(session.bookingDate)}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 font-mono text-[10.5px] text-[var(--text-4)]">
                      <Hash className="size-3" /> Booking {session.bookingId}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-[var(--text-2)] tabular-nums">
                    <Clock3 className="size-3 text-[var(--text-4)]" />
                    {formatTime(session.startTime)} to {formatTime(session.endTime)}
                    {session.endsNextDay && (
                      <span className="text-[var(--semantic-amber)]">+1 day</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <span className="font-mono text-[10.5px] text-[var(--text-3)]">
                      {durationLabel(session.durationMinutes)}
                    </span>
                    <span className="rounded-full bg-[rgba(16,185,129,0.08)] px-2 py-0.5 text-[9.5px] font-medium text-[var(--semantic-green)]">
                      {session.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function BreakdownPagination({
  breakdown,
  loading,
  onPageChange,
}: {
  breakdown: InvoiceBreakdownResponse;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  const { charges } = breakdown;
  const firstItem = charges.totalElements === 0 ? 0 : charges.number * charges.size + 1;
  const lastItem = Math.min(
    (charges.number + 1) * charges.size,
    charges.totalElements,
  );
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--bg-0)] px-5 py-3 sm:px-6">
      <p className="font-mono text-[10.5px] text-[var(--text-4)] tabular-nums">
        {firstItem}-{lastItem} of {charges.totalElements} charges
      </p>
      <div className="flex items-center gap-2">
        <span className="mr-1 text-[10.5px] text-[var(--text-3)]">
          Page {charges.totalPages === 0 ? 0 : charges.number + 1} of {charges.totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={loading || charges.number <= 0}
          onClick={() => onPageChange(charges.number - 1)}
          aria-label="Previous charge page"
        >
          <ChevronLeft />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={loading || charges.number + 1 >= charges.totalPages}
          onClick={() => onPageChange(charges.number + 1)}
          aria-label="Next charge page"
        >
          <ChevronRight />
        </Button>
      </div>
    </footer>
  );
}

function BreakdownSkeleton() {
  return (
    <div className="space-y-7 px-5 py-5 sm:px-6" aria-label="Loading invoice breakdown">
      <div className="h-[112px] animate-pulse rounded-xl border border-[var(--border)] bg-[var(--bg-0)]" />
      <div className="space-y-2.5">
        <div className="h-4 w-32 animate-pulse rounded bg-[var(--bg-2)]" />
        <div className="h-28 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--bg-0)]" />
      </div>
      <div className="space-y-2.5">
        <div className="h-4 w-28 animate-pulse rounded bg-[var(--bg-2)]" />
        <div className="h-64 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--bg-0)]" />
      </div>
    </div>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="grid min-h-[420px] place-items-center px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto grid size-10 place-items-center rounded-full bg-[rgba(244,63,94,0.1)] text-[var(--semantic-red)]">
          <AlertCircle className="size-4" />
        </div>
        <h3 className="mt-3 text-[14px] font-semibold text-[var(--text-1)]">
          Could not load breakdown
        </h3>
        <p className="mt-1.5 text-[12px] leading-5 text-[var(--text-3)]">{message}</p>
        <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>
          <RefreshCw /> Try again
        </Button>
      </div>
    </div>
  );
}

function UnavailableState({ reason }: { reason: string | null }) {
  return (
    <div className="grid min-h-[420px] place-items-center text-center">
      <div className="max-w-sm">
        <div className="mx-auto grid size-10 place-items-center rounded-full bg-[var(--semantic-amber-subtle)] text-[var(--semantic-amber)]">
          <AlertCircle className="size-4" />
        </div>
        <h3 className="mt-3 text-[14px] font-semibold text-[var(--text-1)]">
          Detailed evidence is unavailable
        </h3>
        <p className="mt-1.5 text-[12px] leading-5 text-[var(--text-3)]">
          {reason || "This invoice was generated before charge snapshots were recorded."}
        </p>
      </div>
    </div>
  );
}
