"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  SearchX,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  exportAuditEvents,
  getApiErrorMessage,
  getAuditEvents,
} from "@/lib/api";
import { downloadBlob } from "@/lib/export";
import { cn } from "@/lib/utils";
import type {
  AuditEvent,
  AuditEventFilters,
  AuditEventOutcome,
  PageResponse,
} from "@/types/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  auditActionTone,
  auditActorLabel,
  auditInitials,
  auditOutcomeTone,
  formatAuditTimestamp,
  humanizeAuditValue,
} from "./_lib/audit-format";

const DEFAULT_PAGE_SIZE = 20;

interface AuditFilterDraft {
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  outcome: "" | Exclude<AuditEventOutcome, "UNKNOWN">;
  from: string;
  to: string;
}

const EMPTY_FILTERS: AuditFilterDraft = {
  actorEmail: "",
  action: "",
  entityType: "",
  entityId: "",
  outcome: "",
  from: "",
  to: "",
};

function dateBoundary(value: string, endOfDay: boolean): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function toApiFilters(filters: AuditFilterDraft): AuditEventFilters {
  return {
    actorEmail: filters.actorEmail.trim() || undefined,
    action: filters.action.trim() || undefined,
    entityType: filters.entityType.trim() || undefined,
    entityId: filters.entityId.trim() || undefined,
    outcome: filters.outcome || undefined,
    from: dateBoundary(filters.from, false),
    to: dateBoundary(filters.to, true),
  };
}

function activeFilterCount(filters: AuditFilterDraft): number {
  return Object.values(filters).filter((value) => value.trim().length > 0)
    .length;
}

export default function AuditEventsPage() {
  const [draftFilters, setDraftFilters] =
    useState<AuditFilterDraft>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<AuditFilterDraft>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<PageResponse<AuditEvent> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const requestSequence = useRef(0);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    const sequence = ++requestSequence.current;

    async function load() {
      setIsFetching(true);
      if (!hasLoadedOnce.current) setIsLoading(true);
      try {
        const response = await getAuditEvents({
          ...toApiFilters(appliedFilters),
          page,
          size: pageSize,
        });
        if (sequence !== requestSequence.current) return;
        setData(response);
        setError("");
        hasLoadedOnce.current = true;
      } catch (loadError: unknown) {
        if (sequence !== requestSequence.current) return;
        setError(
          getApiErrorMessage(loadError, "Could not load the audit trail."),
        );
      } finally {
        if (sequence === requestSequence.current) {
          setIsLoading(false);
          setIsFetching(false);
        }
      }
    }

    void load();
  }, [appliedFilters, page, pageSize, reloadToken]);

  const appliedCount = activeFilterCount(appliedFilters);
  const rows = data?.content ?? [];

  const applyFilters = useCallback(() => {
    if (
      draftFilters.from &&
      draftFilters.to &&
      draftFilters.from > draftFilters.to
    ) {
      toast.error("The start date must be before the end date.");
      return;
    }
    setPage(0);
    setAppliedFilters({ ...draftFilters });
  }, [draftFilters]);

  const clearFilters = useCallback(() => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(0);
  }, []);

  async function handleExport() {
    setIsExporting(true);
    try {
      const blob = await exportAuditEvents(toApiFilters(appliedFilters));
      const day = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `athlits-audit-events-${day}.csv`);
      toast.success(
        appliedCount > 0
          ? "Filtered audit events exported"
          : "Audit events exported",
      );
    } catch (exportError: unknown) {
      toast.error(
        getApiErrorMessage(exportError, "Could not export audit events."),
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="audit-events-v2 space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-1)]">
              Audit events
            </h1>
            {data && (
              <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-1)] px-2 py-[2px] font-mono text-[11px] font-medium tabular-nums text-[var(--text-3)]">
                {data.totalElements}
              </span>
            )}
          </div>
          <p className="text-[13px] tracking-[-0.003em] text-[var(--text-3)]">
            Review platform-admin activity, affected records, and request
            context.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="gap-1.5 border border-[rgba(0,212,170,0.22)] bg-[var(--teal)] px-3.5 text-[13px] font-semibold text-[#032921] shadow-[0_0_20px_-6px_rgba(0,212,170,0.35)] hover:bg-[var(--teal)] hover:brightness-110"
        >
          {isExporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {isExporting ? "Preparing CSV" : "Export CSV"}
        </Button>
      </header>

      <section aria-label="Audit event filters">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              aria-expanded={filtersOpen}
              aria-controls="audit-filter-panel"
              onClick={() => setFiltersOpen((open) => !open)}
              className={cn(
                "gap-1.5 border-[var(--border)] bg-[var(--bg-1)] text-[12.5px] text-[var(--text-2)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]",
                filtersOpen &&
                  "border-[rgba(0,212,170,0.22)] bg-[var(--teal-subtle)] text-[var(--teal-text)]",
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {appliedCount > 0 && (
                <span className="ml-0.5 rounded-full bg-[var(--teal)] px-1.5 py-px font-mono text-[10px] font-semibold text-[#032921]">
                  {appliedCount}
                </span>
              )}
            </Button>
            {appliedCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12px] text-[var(--text-3)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--text-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isFetching && !isLoading && (
              <span
                aria-live="polite"
                className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-4)]"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                Updating
              </span>
            )}
            <label
              htmlFor="audit-page-size"
              className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]"
            >
              Rows
            </label>
            <select
              id="audit-page-size"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(0);
              }}
              className="h-8 rounded-md border border-[var(--border)] bg-[var(--bg-1)] px-2 text-[12px] text-[var(--text-2)] outline-none transition-colors focus:border-[var(--teal)] focus:ring-[3px] focus:ring-[var(--teal-subtle)]"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {filtersOpen && (
          <form
            id="audit-filter-panel"
            onSubmit={(event) => {
              event.preventDefault();
              applyFilters();
            }}
            className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-1)] p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-[var(--teal-text)]" />
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--text-2)]">
                Narrow the trail
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <FilterField
                id="audit-actor"
                label="Actor email"
                value={draftFilters.actorEmail}
                placeholder="admin@athlits.com"
                onChange={(actorEmail) =>
                  setDraftFilters((current) => ({ ...current, actorEmail }))
                }
              />
              <FilterField
                id="audit-action"
                label="Action"
                value={draftFilters.action}
                placeholder="VENUE_UPDATED"
                onChange={(action) =>
                  setDraftFilters((current) => ({ ...current, action }))
                }
              />
              <FilterField
                id="audit-entity-type"
                label="Entity type"
                value={draftFilters.entityType}
                placeholder="VENUE"
                onChange={(entityType) =>
                  setDraftFilters((current) => ({ ...current, entityType }))
                }
              />
              <FilterField
                id="audit-entity-id"
                label="Entity ID"
                value={draftFilters.entityId}
                placeholder="Record ID"
                mono
                onChange={(entityId) =>
                  setDraftFilters((current) => ({ ...current, entityId }))
                }
              />
              <div className="space-y-1.5">
                <label
                  htmlFor="audit-outcome"
                  className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]"
                >
                  Outcome
                </label>
                <select
                  id="audit-outcome"
                  value={draftFilters.outcome}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      outcome: event.target.value as AuditFilterDraft["outcome"],
                    }))
                  }
                  className="h-[38px] w-full rounded-md border border-[var(--border)] bg-[var(--bg-0)] px-3 text-[12.5px] text-[var(--text-2)] outline-none transition-all focus:border-[var(--teal)] focus:ring-[3px] focus:ring-[var(--teal-subtle)]"
                >
                  <option value="">Any outcome</option>
                  <option value="SUCCESS">Success</option>
                  <option value="FAILURE">Failure</option>
                  <option value="DENIED">Denied</option>
                </select>
              </div>
              <FilterField
                id="audit-from"
                label="From"
                type="date"
                value={draftFilters.from}
                onChange={(from) =>
                  setDraftFilters((current) => ({ ...current, from }))
                }
              />
              <FilterField
                id="audit-to"
                label="To"
                type="date"
                value={draftFilters.to}
                onChange={(to) =>
                  setDraftFilters((current) => ({ ...current, to }))
                }
              />
              <div className="flex items-end gap-2">
                <Button
                  type="submit"
                  className="h-[38px] flex-1 bg-[var(--teal)] text-[12.5px] font-semibold text-[#032921] hover:bg-[var(--teal)] hover:brightness-110"
                >
                  Apply filters
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  aria-label="Clear audit event filters"
                  className="h-[38px] border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-3)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]"
                >
                  Reset
                </Button>
              </div>
            </div>
          </form>
        )}
      </section>

      {error && data && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-[rgba(245,158,11,0.2)] bg-[var(--semantic-amber-subtle)] px-4 py-3"
        >
          <div className="flex min-w-0 items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--semantic-amber)]" />
            <p className="truncate text-[12.5px] text-[var(--text-2)]">
              {error}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            className="shrink-0 text-[12px] font-medium text-[var(--semantic-amber)] hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      <AuditEventsBody
        data={data}
        rows={rows}
        error={error}
        isLoading={isLoading}
        isFetching={isFetching}
        appliedCount={appliedCount}
        pageSize={pageSize}
        onClear={clearFilters}
        onRetry={() => setReloadToken((token) => token + 1)}
        onPage={setPage}
      />
    </div>
  );
}

function FilterField({
  id,
  label,
  value,
  placeholder,
  type = "text",
  mono = false,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  type?: "text" | "date";
  mono?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-[38px] w-full rounded-md border border-[var(--border)] bg-[var(--bg-0)] px-3 text-[12.5px] text-[var(--text-1)] outline-none transition-all placeholder:text-[var(--text-4)] focus:border-[var(--teal)] focus:ring-[3px] focus:ring-[var(--teal-subtle)]",
          mono && "font-mono",
        )}
      />
    </div>
  );
}

function AuditEventsBody({
  data,
  rows,
  error,
  isLoading,
  isFetching,
  appliedCount,
  pageSize,
  onClear,
  onRetry,
  onPage,
}: {
  data: PageResponse<AuditEvent> | null;
  rows: AuditEvent[];
  error: string;
  isLoading: boolean;
  isFetching: boolean;
  appliedCount: number;
  pageSize: number;
  onClear: () => void;
  onRetry: () => void;
  onPage: (page: number) => void;
}) {
  if (isLoading) return <AuditEventsSkeleton />;
  if (!data && error) return <AuditEventsError message={error} onRetry={onRetry} />;
  if (!data) return null;
  if (rows.length === 0) {
    return (
      <AuditEventsEmpty
        filtered={appliedCount > 0}
        onClear={onClear}
      />
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)] transition-opacity",
        isFetching && "opacity-60",
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead>
            <tr className="bg-white/[0.012]">
              {["Time", "Actor", "Action", "Target", "Origin", "Outcome", ""].map(
                (heading, index) => (
                  <th
                    key={`${heading}-${index}`}
                    className={cn(
                      "border-b border-[var(--border)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]",
                      index === 4 && "hidden xl:table-cell",
                      index === 6 && "w-10",
                    )}
                  >
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((event) => (
              <AuditEventRow key={event.id} event={event} />
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        data={data}
        pageSize={pageSize}
        disabled={isFetching}
        onPage={onPage}
      />
    </div>
  );
}

function AuditEventRow({ event }: { event: AuditEvent }) {
  const outcome = auditOutcomeTone(event.outcome);
  return (
    <tr className="group transition-colors hover:bg-white/[0.018]">
      <td className="border-t border-white/[0.035] px-4 py-3 align-middle">
        <div className="flex flex-col gap-0.5 whitespace-nowrap">
          <span className="font-mono text-[11.5px] tabular-nums text-[var(--text-2)]">
            {formatAuditTimestamp(event.occurredAt)}
          </span>
          <span className="font-mono text-[9.5px] text-[var(--text-4)]">
            {event.id}
          </span>
        </div>
      </td>
      <td className="border-t border-white/[0.035] px-4 py-3 align-middle">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[rgba(0,212,170,0.16)] bg-[var(--teal-subtle)] text-[10px] font-semibold text-[var(--teal-text)]">
            {auditInitials(event)}
          </div>
          <div className="min-w-0">
            <p className="max-w-[190px] truncate text-[12.5px] font-medium text-[var(--text-1)]">
              {auditActorLabel(event)}
            </p>
            <p className="text-[10.5px] text-[var(--text-4)]">
              {humanizeAuditValue(event.actorRole)}
            </p>
          </div>
        </div>
      </td>
      <td className="border-t border-white/[0.035] px-4 py-3 align-middle">
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-1 text-[10.5px] font-semibold",
            auditActionTone(event.action),
          )}
        >
          {humanizeAuditValue(event.action)}
        </span>
      </td>
      <td className="border-t border-white/[0.035] px-4 py-3 align-middle">
        <div className="flex max-w-[220px] flex-col gap-0.5">
          <span className="text-[12px] font-medium text-[var(--text-2)]">
            {humanizeAuditValue(event.entityType ?? "Platform")}
          </span>
          {event.entityId && (
            <span className="truncate font-mono text-[10px] text-[var(--text-4)]">
              {event.entityId}
            </span>
          )}
        </div>
      </td>
      <td className="hidden border-t border-white/[0.035] px-4 py-3 align-middle xl:table-cell">
        <div className="flex max-w-[230px] flex-col gap-0.5">
          <span className="truncate font-mono text-[10.5px] text-[var(--text-3)]">
            {[event.requestMethod, event.requestPath].filter(Boolean).join(" ") ||
              "Request not recorded"}
          </span>
          <span className="font-mono text-[10px] text-[var(--text-4)]">
            {event.ipAddress ?? "IP not recorded"}
          </span>
        </div>
      </td>
      <td className="border-t border-white/[0.035] px-4 py-3 align-middle">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10.5px] font-medium",
            outcome.pill,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", outcome.dot)} />
          {outcome.label}
        </span>
      </td>
      <td className="border-t border-white/[0.035] px-3 py-3 text-right align-middle">
        <Link
          href={`/dashboard/audit-events/${encodeURIComponent(event.id)}`}
          aria-label={`View audit event ${event.id}`}
          className="inline-grid h-8 w-8 place-items-center rounded-md text-[var(--text-4)] transition-colors hover:bg-[var(--teal-subtle)] hover:text-[var(--teal-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </td>
    </tr>
  );
}

function Pagination({
  data,
  pageSize,
  disabled,
  onPage,
}: {
  data: PageResponse<AuditEvent>;
  pageSize: number;
  disabled: boolean;
  onPage: (page: number) => void;
}) {
  const totalPages = Math.max(1, data.totalPages);
  const current = data.number;
  const start = data.totalElements === 0 ? 0 : current * pageSize + 1;
  const end = current * pageSize + (data.numberOfElements ?? data.content.length);
  const first = data.first ?? current === 0;
  const last = data.last ?? current + 1 >= totalPages;

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border)] bg-white/[0.008] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="font-mono text-[11.5px] tabular-nums text-[var(--text-4)]">
        Showing {start} to {end} of {data.totalElements}
      </span>
      <div className="flex items-center gap-1.5">
        <PageButton
          disabled={first || disabled}
          onClick={() => onPage(current - 1)}
          label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </PageButton>
        {pageWindow(current, totalPages).map((value, index) =>
          value === "gap" ? (
            <span
              key={`gap-${index}`}
              className="px-1 font-mono text-[11px] text-[var(--text-4)]"
            >
              …
            </span>
          ) : (
            <PageButton
              key={value}
              active={value === current}
              disabled={disabled}
              onClick={() => onPage(value)}
              label={`Page ${value + 1}`}
            >
              {value + 1}
            </PageButton>
          ),
        )}
        <PageButton
          disabled={last || disabled}
          onClick={() => onPage(current + 1)}
          label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </PageButton>
      </div>
    </div>
  );
}

function pageWindow(current: number, total: number): Array<number | "gap"> {
  const candidates = [0, current - 1, current, current + 1, total - 1]
    .filter((value) => value >= 0 && value < total)
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort((a, b) => a - b);
  const result: Array<number | "gap"> = [];
  candidates.forEach((value, index) => {
    if (index > 0 && value - candidates[index - 1] > 1) result.push("gap");
    result.push(value);
  });
  return result;
}

function PageButton({
  children,
  active = false,
  disabled,
  onClick,
  label,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid h-7 min-w-7 place-items-center rounded-md px-1.5 font-mono text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)] disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "bg-[var(--teal-subtle)] text-[var(--teal-text)]"
          : "border border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-3)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]",
      )}
    >
      {children}
    </button>
  );
}

function AuditEventsSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="divide-y divide-white/[0.035]">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-6 flex-1" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditEventsError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--bg-1)] py-16 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-[rgba(244,63,94,0.2)] bg-[var(--semantic-red-subtle)]">
        <AlertTriangle className="h-6 w-6 text-[var(--semantic-red)]" />
      </div>
      <h2 className="text-[15px] font-semibold text-[var(--text-1)]">
        Could not load audit events
      </h2>
      <p className="mt-1.5 max-w-md text-[13px] text-[var(--text-3)]">
        {message}
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={onRetry}
        className="mt-5 gap-1.5 border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-2)] hover:text-[var(--text-1)]"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </Button>
    </div>
  );
}

function AuditEventsEmpty({
  filtered,
  onClear,
}: {
  filtered: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--bg-1)] py-16 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-[var(--border)] bg-[var(--bg-2)]">
        {filtered ? (
          <SearchX className="h-6 w-6 text-[var(--text-4)]" />
        ) : (
          <ShieldCheck className="h-6 w-6 text-[var(--teal-text)]" />
        )}
      </div>
      <h2 className="text-[15px] font-semibold text-[var(--text-1)]">
        {filtered ? "No events match these filters" : "No audit events yet"}
      </h2>
      <p className="mt-1.5 max-w-md text-[13px] text-[var(--text-3)]">
        {filtered
          ? "Adjust the actor, action, target, outcome, or time window."
          : "Platform-admin activity will appear here as it is recorded."}
      </p>
      {filtered && (
        <Button
          type="button"
          variant="outline"
          onClick={onClear}
          className="mt-5 border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-2)] hover:text-[var(--text-1)]"
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
