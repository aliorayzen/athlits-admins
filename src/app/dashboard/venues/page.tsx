"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Download,
  Edit3,
  MapPin,
  Pause,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
} from "lucide-react";

import { getApiErrorMessage, getVenues } from "@/lib/api";
import type { VenueSummaryResponse } from "@/types/api";
import { downloadCSV } from "@/lib/export";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type StatusFilter = "all" | "ACTIVE" | "SUSPENDED";
type SortKey = "name" | "city" | "rating" | "created";
type SortDir = "asc" | "desc";

interface SortState {
  key: SortKey;
  dir: SortDir;
}

const STATUS_FILTERS: Array<{
  key: StatusFilter;
  label: string;
  dotClass: string;
}> = [
  { key: "all", label: "All", dotClass: "bg-[var(--text-4)]" },
  {
    key: "ACTIVE",
    label: "Active",
    dotClass: "bg-[var(--semantic-green)] vv2-dot-ok",
  },
  {
    key: "SUSPENDED",
    label: "Suspended",
    dotClass: "bg-[var(--semantic-amber)] vv2-dot-warn",
  },
];

/** Convert a 2-letter ISO country code to its flag emoji (client-side). */
function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  const upper = code.toUpperCase();
  const REGIONAL_INDICATOR_A = 0x1f1e6;
  const LETTER_A_CODE = 65; // 'A'
  return String.fromCodePoint(
    REGIONAL_INDICATOR_A + (upper.charCodeAt(0) - LETTER_A_CODE),
    REGIONAL_INDICATOR_A + (upper.charCodeAt(1) - LETTER_A_CODE),
  );
}

function hashGradient(id: string): "vv2-g1" | "vv2-g2" | "vv2-g3" | "vv2-g4" {
  const sum = [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const variants = ["vv2-g1", "vv2-g2", "vv2-g3", "vv2-g4"] as const;
  return variants[sum % variants.length];
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase() || "V";
}

function isCreatedThisMonth(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
}

function formatCreatedDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export default function VenuesPage() {
  const [venues, setVenues] = useState<VenueSummaryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortState>({ key: "created", dir: "desc" });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // `reloadKey` lets the ErrorState "Try again" button re-trigger the fetch.
  const [reloadKey, setReloadKey] = useState(0);
  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    async function load() {
      try {
        const real = await getVenues();
        if (cancelled) return;
        setVenues(real);
      } catch (err: unknown) {
        if (cancelled) return;
        setVenues([]);
        setError(getApiErrorMessage(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const kpis = useMemo(() => {
    const total = venues.length;
    const active = venues.filter((v) => v.status === "ACTIVE").length;
    const suspended = venues.filter((v) => v.status === "SUSPENDED").length;
    const rated = venues.filter(
      (v): v is VenueSummaryResponse & { venueRating: number } =>
        typeof v.venueRating === "number",
    );
    const avgRating =
      rated.length > 0
        ? rated.reduce((sum, v) => sum + v.venueRating, 0) / rated.length
        : null;
    const newThisMonth = venues.filter((v) =>
      isCreatedThisMonth(v.createdAt),
    ).length;
    const activeShare = total > 0 ? (active / total) * 100 : 0;
    return { total, active, suspended, avgRating, newThisMonth, activeShare };
  }, [venues]);

  const statusCounts = useMemo(
    () => ({
      all: venues.length,
      ACTIVE: venues.filter((v) => v.status === "ACTIVE").length,
      SUSPENDED: venues.filter((v) => v.status === "SUSPENDED").length,
    }),
    [venues],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = venues;
    if (statusFilter !== "all") {
      list = list.filter((v) => v.status === statusFilter);
    }
    if (q.length > 0) {
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.city.toLowerCase().includes(q) ||
          v.slug.toLowerCase().includes(q),
      );
    }
    const sorted = [...list].sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      switch (sort.key) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "city":
          return a.city.localeCompare(b.city) * dir;
        case "rating":
          return ((a.venueRating ?? -1) - (b.venueRating ?? -1)) * dir;
        case "created":
        default:
          return (
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()) *
            dir
          );
      }
    });
    return sorted;
  }, [venues, search, statusFilter, sort]);

  const selectedRows = useMemo(
    () => filtered.filter((v) => selectedIds.has(v.id)),
    [filtered, selectedIds],
  );

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((v) => selectedIds.has(v.id));
  const someVisibleSelected =
    filtered.some((v) => selectedIds.has(v.id)) && !allVisibleSelected;

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        filtered.forEach((v) => next.delete(v.id));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach((v) => next.add(v.id));
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function onSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  const exportList = useCallback(
    (list: VenueSummaryResponse[], suffix: string) => {
      const headers = [
        "Name",
        "Slug",
        "City",
        "Country",
        "Status",
        "Rating",
        "CreatedAt",
      ];
      const rows = list.map((v) => [
        v.name,
        v.slug,
        v.city,
        v.countryCode,
        v.status,
        v.venueRating?.toFixed(1) ?? "-",
        v.createdAt.slice(0, 10),
      ]);
      downloadCSV(
        `venues-${suffix}-${new Date().toISOString().slice(0, 10)}`,
        headers,
        rows,
      );
      toast.success(
        `Exported ${list.length} ${list.length === 1 ? "venue" : "venues"}`,
      );
    },
    [],
  );

  // Chip sliding indicator — measure active chip + position absolute indicator
  const chipRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    transform: string;
    width: number;
    opacity: number;
  }>({ transform: "translateX(0px)", width: 0, opacity: 0 });

  useEffect(() => {
    const idx = STATUS_FILTERS.findIndex((f) => f.key === statusFilter);
    const el = chipRefs.current[idx];
    if (!el) return;
    setIndicatorStyle({
      transform: `translateX(${el.offsetLeft - 2}px)`,
      width: el.offsetWidth,
      opacity: 1,
    });
  }, [statusFilter, venues.length]);

  return (
    <div className="venues-v2 space-y-5">
      {/* ═══════════ Header ═══════════ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-1)]">
              Venues
            </h1>
            {!isLoading && (
              <span className="vv2-count-pill inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-1)] px-2 py-[2px] font-mono text-[11px] font-medium tabular-nums text-[var(--text-3)]">
                {venues.length}
              </span>
            )}
          </div>
          <p className="text-[13px] tracking-[-0.003em] text-[var(--text-3)]">
            Manage all onboarded venues and corporates
          </p>
        </div>
        <div className="flex gap-2">
          {venues.length > 0 && (
            <Button
              variant="outline"
              onClick={() => exportList(filtered, "filtered")}
              className="gap-1.5 border-[var(--border)] bg-[var(--bg-1)] text-[13px] text-[var(--text-2)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          )}
          <Link href="/dashboard/venues/new">
            <Button className="gap-1.5 border border-[rgba(0,212,170,0.3)] bg-[linear-gradient(135deg,#00d4aa_0%,#00b894_100%)] px-4 text-[13px] font-semibold text-[#032921] shadow-[0_0_20px_-6px_rgba(0,212,170,0.35)] hover:bg-[linear-gradient(135deg,#1be2ba_0%,#0cc89f_100%)] hover:shadow-[0_0_28px_-6px_rgba(0,212,170,0.5)] hover:-translate-y-px">
              <Plus className="h-3.5 w-3.5" />
              Add Venue
            </Button>
          </Link>
        </div>
      </div>

      {/* ═══════════ KPI strip ═══════════ */}
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.01)_0%,transparent_50%),var(--bg-1)] sm:grid-cols-4">
        <KpiCell
          label="Total venues"
          value={isLoading ? "—" : String(kpis.total)}
          dotClass=""
          sub={
            isLoading
              ? null
              : kpis.newThisMonth > 0
                ? `+${kpis.newThisMonth} this month`
                : "No new venues this month"
          }
          subHighlight={kpis.newThisMonth > 0}
          borderLeft={false}
        />
        <KpiCell
          label="Active"
          value={isLoading ? "—" : String(kpis.active)}
          valueToneClass="text-[#22d3ee]"
          dotClass="bg-[var(--semantic-green)] vv2-dot-ok"
          sub={
            isLoading
              ? null
              : kpis.total > 0
                ? `${kpis.activeShare.toFixed(1)}% of total`
                : null
          }
          borderLeft
        />
        <KpiCell
          label="Suspended"
          value={isLoading ? "—" : String(kpis.suspended)}
          dotClass="bg-[var(--semantic-amber)] vv2-dot-warn"
          sub={
            isLoading
              ? null
              : kpis.suspended === 0
                ? "All venues active"
                : `${kpis.suspended} venues need review`
          }
          borderLeft
        />
        <KpiCell
          label="Avg rating"
          value={
            isLoading
              ? "—"
              : kpis.avgRating !== null
                ? kpis.avgRating.toFixed(1)
                : "—"
          }
          valueSuffix={
            kpis.avgRating !== null && !isLoading ? (
              <span className="text-[14px] font-medium text-[var(--text-4)]">
                {" "}
                / 5
              </span>
            ) : null
          }
          dotClass="bg-[var(--teal)] vv2-dot-star"
          sub={
            isLoading
              ? null
              : kpis.avgRating !== null
                ? "Across rated venues"
                : "No ratings yet"
          }
          borderLeft
        />
      </div>

      {/* ═══════════ Bulk selection bar ═══════════ */}
      {selectedIds.size > 0 && (
        <div className="vv2-bulk-bar flex items-center justify-between gap-4 rounded-md border border-[rgba(0,212,170,0.18)] bg-[linear-gradient(180deg,rgba(0,212,170,0.08),rgba(0,212,170,0.02)),var(--bg-1)] px-3.5 py-2">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--teal-subtle)] px-2.5 py-[3px] font-mono text-[11px] font-semibold text-[var(--teal-text)]">
              {selectedIds.size} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-[12px] font-medium text-[var(--text-3)] transition-colors hover:text-[var(--text-1)]"
              type="button"
            >
              Clear
            </button>
          </div>
          <div className="flex gap-1.5">
            <BulkBtn
              onClick={() => exportList(selectedRows, "selected")}
              title="Export selected as CSV"
            >
              <Download className="h-3 w-3" />
              Export
            </BulkBtn>
            <BulkBtn
              onClick={() => toast.info("Bulk suspend — coming soon")}
              title="Suspend selected"
            >
              <Pause className="h-3 w-3" />
              Suspend
            </BulkBtn>
            <BulkBtn
              danger
              onClick={() => toast.info("Bulk delete — coming soon")}
              title="Delete selected"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </BulkBtn>
          </div>
        </div>
      )}

      {/* ═══════════ Filter bar ═══════════ */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative inline-flex items-center gap-[2px] rounded-md border border-[var(--border)] bg-[var(--bg-1)] p-[2px]">
          <span
            className="vv2-chip-indicator"
            style={{
              transform: indicatorStyle.transform,
              width: indicatorStyle.width,
              opacity: indicatorStyle.opacity,
            }}
            aria-hidden="true"
          />
          {STATUS_FILTERS.map((filter, i) => (
            <button
              key={filter.key}
              ref={(el) => {
                chipRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={statusFilter === filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={cn(
                "relative z-10 inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                statusFilter === filter.key
                  ? "text-[var(--text-1)]"
                  : "text-[var(--text-3)] hover:text-[var(--text-1)]",
              )}
            >
              <span
                className={cn("h-[5px] w-[5px] rounded-full", filter.dotClass)}
              />
              {filter.label}
              <span className="pl-0.5 font-mono text-[10.5px] tabular-nums text-[var(--text-4)]">
                {statusCounts[filter.key]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-[320px]">
          <Search className="pointer-events-none absolute left-[11px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[var(--text-4)]" />
          <input
            type="search"
            placeholder="Search venues, cities…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--bg-1)] pl-[34px] pr-11 text-[12.5px] text-[var(--text-1)] outline-none transition-all placeholder:text-[var(--text-4)] focus:border-[var(--teal)] focus:shadow-[0_0_0_3px_var(--teal-subtle)]"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-[var(--border)] bg-[var(--bg-2)] px-1.5 py-px font-mono text-[10px] text-[var(--text-4)] opacity-70">
            /
          </span>
        </div>
      </div>

      {/* ═══════════ Table ═══════════ */}
      {isLoading ? (
        <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)]">
          <VenuesSkeleton />
        </div>
      ) : error !== null ? (
        <ErrorState message={error} onRetry={retry} />
      ) : filtered.length === 0 ? (
        <EmptyState
          hasVenues={venues.length > 0}
          onClearFilters={() => {
            setSearch("");
            setStatusFilter("all");
          }}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)]">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead className="bg-white/[0.012]">
                <tr>
                  <Th className="w-10 pl-4 pr-0">
                    <Checkbox
                      checked={allVisibleSelected}
                      indeterminate={someVisibleSelected}
                      onChange={toggleAllVisible}
                      ariaLabel="Select all"
                    />
                  </Th>
                  <SortableTh
                    sortKey="name"
                    label="Venue"
                    sort={sort}
                    onSort={onSort}
                  />
                  <SortableTh
                    sortKey="city"
                    label="City"
                    sort={sort}
                    onSort={onSort}
                  />
                  <Th>Status</Th>
                  <SortableTh
                    sortKey="rating"
                    label="Rating"
                    sort={sort}
                    onSort={onSort}
                  />
                  <Th>Courts</Th>
                  <SortableTh
                    sortKey="created"
                    label="Created"
                    sort={sort}
                    onSort={onSort}
                  />
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((venue) => (
                  <VenueRow
                    key={venue.id}
                    venue={venue}
                    isSelected={selectedIds.has(venue.id)}
                    onToggle={() => toggleRow(venue.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="flex items-center justify-between border-t border-[var(--border)] bg-white/[0.008] px-4 py-3">
            <span className="font-mono text-[12px] tabular-nums text-[var(--text-4)]">
              {filtered.length === venues.length
                ? `${venues.length} ${venues.length === 1 ? "venue" : "venues"}`
                : `${filtered.length} of ${venues.length} venues`}
            </span>
            {selectedIds.size > 0 && (
              <span className="font-mono text-[12px] tabular-nums text-[var(--teal-text)]">
                {selectedIds.size} selected
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Sub-components
   ─────────────────────────────────────────────────────────────── */

interface KpiCellProps {
  label: string;
  value: string;
  valueToneClass?: string;
  valueSuffix?: React.ReactNode;
  dotClass: string;
  sub: string | null;
  subHighlight?: boolean;
  borderLeft: boolean;
}

function KpiCell({
  label,
  value,
  valueToneClass,
  valueSuffix,
  dotClass,
  sub,
  subHighlight,
  borderLeft,
}: KpiCellProps) {
  return (
    <div
      className={cn(
        "relative px-5 py-4",
        borderLeft &&
          "before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-px before:bg-[var(--border)]",
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
        <span
          className={cn(
            "h-[5px] w-[5px] rounded-full",
            dotClass || "bg-[var(--text-4)]",
          )}
        />
        {label}
      </div>
      <div
        className={cn(
          "mt-2 text-[28px] font-bold leading-none tracking-[-0.035em] tabular-nums",
          valueToneClass ?? "text-[var(--text-1)]",
        )}
      >
        {value}
        {valueSuffix}
      </div>
      {sub && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--text-3)]">
          {subHighlight && (
            <span className="font-mono text-[10.5px] font-medium text-[var(--semantic-green)] tabular-nums">
              {sub.split(" ")[0]}
            </span>
          )}
          <span>{subHighlight ? sub.split(" ").slice(1).join(" ") : sub}</span>
        </div>
      )}
    </div>
  );
}

function BulkBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded border border-[var(--border-strong)] bg-[var(--bg-2)] px-2.5 py-[5px] text-[12px] font-medium text-[var(--text-2)] transition-all",
        danger
          ? "hover:border-[rgba(244,63,94,0.3)] hover:bg-[var(--semantic-red-subtle)] hover:text-[var(--semantic-red)]"
          : "hover:border-[rgba(0,212,170,0.18)] hover:bg-[var(--teal-subtle)] hover:text-[var(--teal-text)]",
      )}
    >
      {children}
    </button>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "border-b border-[var(--border)] px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)] whitespace-nowrap select-none",
        className,
      )}
    >
      {children}
    </th>
  );
}

function SortableTh({
  sortKey,
  label,
  sort,
  onSort,
}: {
  sortKey: SortKey;
  label: string;
  sort: SortState;
  onSort: (key: SortKey) => void;
}) {
  const isActive = sort.key === sortKey;
  return (
    <th
      aria-sort={
        isActive ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
      }
      className="border-b border-[var(--border)] px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)] whitespace-nowrap select-none"
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "group inline-flex items-center gap-1.5 transition-colors hover:text-[var(--text-2)]",
          isActive && "text-[var(--text-2)]",
        )}
      >
        {label}
        <span className="inline-flex flex-col gap-[1px]">
          <ChevronUp
            className={cn(
              "h-[7px] w-[7px] transition-opacity",
              isActive && sort.dir === "asc"
                ? "text-[var(--teal)] opacity-100"
                : isActive
                  ? "text-[var(--teal)] opacity-25"
                  : "opacity-35 group-hover:opacity-70",
            )}
          />
          <ChevronDown
            className={cn(
              "h-[7px] w-[7px] transition-opacity",
              isActive && sort.dir === "desc"
                ? "text-[var(--teal)] opacity-100"
                : isActive
                  ? "text-[var(--teal)] opacity-25"
                  : "opacity-35 group-hover:opacity-70",
            )}
          />
        </span>
      </button>
    </th>
  );
}

function Checkbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  const state = indeterminate ? "indeterminate" : checked ? "checked" : "idle";
  return (
    <button
      type="button"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      role="checkbox"
      onClick={onChange}
      className={cn(
        "vv2-checkbox relative block h-[14px] w-[14px] rounded-[3px] border-[1.3px] transition-all",
        state === "idle" &&
          "border-[var(--border-strong)] bg-transparent hover:border-[var(--teal)]",
        state === "checked" && "border-[var(--teal)] bg-[var(--teal)]",
        state === "indeterminate" && "border-[var(--teal)] bg-[var(--teal)]",
      )}
    >
      {state === "checked" && (
        <span
          aria-hidden="true"
          className="absolute left-[3px] top-0 h-2 w-1 rotate-45 border-b-[1.5px] border-r-[1.5px] border-[#032921]"
        />
      )}
      {state === "indeterminate" && (
        <span
          aria-hidden="true"
          className="absolute left-[2px] right-[2px] top-1/2 h-[1.5px] -translate-y-1/2 bg-[#032921]"
        />
      )}
    </button>
  );
}

function VenueRow({
  venue,
  isSelected,
  onToggle,
}: {
  venue: VenueSummaryResponse;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const isNew = isCreatedThisMonth(venue.createdAt);
  return (
    <tr
      className={cn(
        "vv2-tr group transition-colors",
        isSelected
          ? "bg-[rgba(0,212,170,0.04)] hover:bg-[rgba(0,212,170,0.055)]"
          : "hover:bg-[rgba(255,255,255,0.015)]",
      )}
    >
      <td className="border-t border-[rgba(255,255,255,0.035)] px-4 py-3 align-middle">
        <Checkbox
          checked={isSelected}
          onChange={onToggle}
          ariaLabel={`Select ${venue.name}`}
        />
      </td>
      <td className="border-t border-[rgba(255,255,255,0.035)] px-4 py-3 align-middle">
        <div className="flex min-w-[240px] items-center gap-3">
          <div className="vv2-thumb relative h-[38px] w-[38px] shrink-0 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-2)]">
            {venue.coverImageUrl ? (
              <Image
                src={venue.coverImageUrl}
                alt=""
                width={38}
                height={38}
                sizes="38px"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className={cn("vv2-thumb-fallback", hashGradient(venue.id))}>
                {initialsOf(venue.name)}
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-[2px]">
            <div className="flex items-center gap-1.5 text-[13.5px] font-medium leading-[1.25] tracking-[-0.005em] text-[var(--text-1)]">
              <span className="truncate">{venue.name}</span>
              {isNew && (
                <span className="vv2-new-tag inline-flex items-center rounded-[3px] border border-[rgba(0,212,170,0.14)] bg-[var(--teal-subtle)] px-1.5 py-px text-[9px] font-semibold uppercase leading-[1.4] tracking-[0.06em] text-[var(--teal-text)]">
                  New
                </span>
              )}
            </div>
            <div className="truncate font-mono text-[11px] text-[var(--text-4)]">
              {venue.slug}
            </div>
          </div>
        </div>
      </td>
      <td className="border-t border-[rgba(255,255,255,0.035)] px-4 py-3 align-middle">
        <div className="flex items-center gap-1.5 text-[12.5px] text-[var(--text-2)]">
          <span className="text-[14px] leading-none">
            {countryCodeToFlag(venue.countryCode)}
          </span>
          <span>{venue.city}</span>
          <span className="font-mono text-[11px] tabular-nums text-[var(--text-4)]">
            {venue.countryCode}
          </span>
        </div>
      </td>
      <td className="border-t border-[rgba(255,255,255,0.035)] px-4 py-3 align-middle">
        <StatusPill status={venue.status} />
      </td>
      <td className="border-t border-[rgba(255,255,255,0.035)] px-4 py-3 align-middle">
        {typeof venue.venueRating === "number" ? (
          <span className="inline-flex items-center gap-1 text-[12.5px] font-medium tabular-nums text-[var(--text-1)]">
            <Star
              className="h-[13px] w-[13px] text-[var(--semantic-amber)]"
              fill="currentColor"
            />
            {venue.venueRating.toFixed(1)}
          </span>
        ) : (
          <span className="text-[12.5px] text-[var(--text-4)]">—</span>
        )}
      </td>
      <td className="border-t border-[rgba(255,255,255,0.035)] px-4 py-3 align-middle">
        {typeof venue.courtCount === "number" ? (
          <span className="inline-flex items-center gap-1 font-mono text-[12px] tabular-nums text-[var(--text-2)]">
            {venue.courtCount}
            <span className="text-[var(--text-4)]">
              {venue.courtCount === 1 ? "court" : "courts"}
            </span>
          </span>
        ) : (
          <span className="font-mono text-[12px] text-[var(--text-4)]">—</span>
        )}
      </td>
      <td className="border-t border-[rgba(255,255,255,0.035)] px-4 py-3 align-middle">
        <span className="text-[12px] tabular-nums text-[var(--text-3)]">
          {formatCreatedDate(venue.createdAt)}
        </span>
      </td>
      <td className="border-t border-[rgba(255,255,255,0.035)] px-4 py-3 text-right align-middle">
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/dashboard/venues/${venue.id}/edit`}
            title="Edit venue"
            aria-label={`Edit ${venue.name}`}
            className="grid h-7 w-7 place-items-center rounded border border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-3)] opacity-0 transition-all group-hover:opacity-100 hover:border-[rgba(0,212,170,0.18)] hover:bg-[var(--teal-subtle)] hover:text-[var(--teal-text)]"
          >
            <Edit3 className="h-[13px] w-[13px]" />
          </Link>
          <Link
            href={`/dashboard/venues/${venue.id}`}
            className="inline-flex h-7 items-center gap-1.5 rounded border border-[var(--border)] bg-[var(--bg-2)] px-2.5 text-[11.5px] font-medium text-[var(--text-2)] transition-all hover:border-[rgba(0,212,170,0.18)] hover:bg-[var(--teal-subtle)] hover:text-[var(--teal-text)]"
          >
            View
            <ArrowRight className="h-[11px] w-[11px]" />
          </Link>
        </div>
      </td>
    </tr>
  );
}

function StatusPill({ status }: { status: "ACTIVE" | "SUSPENDED" }) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(16,185,129,0.08)] py-[3px] pl-[7px] pr-2 text-[11px] font-medium leading-[1.3] text-[var(--semantic-green)]">
        <span className="vv2-status-active-dot h-[5px] w-[5px] rounded-full bg-[var(--semantic-green)] shadow-[0_0_5px_var(--semantic-green)]" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(245,158,11,0.08)] py-[3px] pl-[7px] pr-2 text-[11px] font-medium leading-[1.3] text-[var(--semantic-amber)]">
      <span className="h-[5px] w-[5px] rounded-full bg-[var(--semantic-amber)]" />
      Suspended
    </span>
  );
}

function VenuesSkeleton() {
  return (
    <div className="divide-y divide-[rgba(255,255,255,0.035)]">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-[14px] w-[14px] rounded-[3px]" />
          <Skeleton className="h-[38px] w-[38px] rounded-md" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-[72px] rounded" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-1)] py-16">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(244,63,94,0.25)] bg-[var(--semantic-red-subtle)]">
        <AlertTriangle className="h-6 w-6 text-[var(--semantic-red)]" />
      </div>
      <p className="text-base font-medium text-[var(--text-1)]">
        Couldn&apos;t load venues
      </p>
      <p className="mt-1.5 max-w-sm text-center text-sm text-[var(--text-3)]">
        {message}
      </p>
      <Button
        variant="outline"
        onClick={onRetry}
        className="mt-5 gap-1.5 border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-2)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </Button>
    </div>
  );
}

function EmptyState({
  hasVenues,
  onClearFilters,
}: {
  hasVenues: boolean;
  onClearFilters: () => void;
}) {
  if (!hasVenues) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-1)] py-16">
        <div className="relative mb-5">
          <div className="absolute -inset-3 rounded-3xl bg-[var(--teal-subtle)] blur-xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--teal-subtle)] ring-1 ring-[rgba(0,212,170,0.3)]">
            <MapPin className="h-7 w-7 text-[var(--teal)]" />
          </div>
        </div>
        <p className="text-base font-medium text-[var(--text-1)]">
          No venues yet
        </p>
        <p className="mt-1 text-sm text-[var(--text-3)]">
          Create your first venue to get started
        </p>
        <Link href="/dashboard/venues/new" className="mt-5">
          <Button
            size="lg"
            className="gap-1.5 bg-[linear-gradient(135deg,var(--teal),#00b894)] px-6 font-semibold text-[var(--bg-0)] shadow-[0_0_24px_-4px_rgba(0,212,170,0.35)] hover:-translate-y-px"
          >
            <Plus className="h-4 w-4" />
            Add Venue
          </Button>
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-1)] py-16">
      <div className="relative mb-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-2)]">
          <Search className="h-6 w-6 text-[var(--text-4)]" />
        </div>
      </div>
      <p className="text-base font-medium text-[var(--text-1)]">
        No matching venues
      </p>
      <p className="mt-1 text-sm text-[var(--text-3)]">
        Try a different search or clear the filters
      </p>
      <Button
        variant="outline"
        onClick={onClearFilters}
        className="mt-4 border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-2)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]"
      >
        Clear filters
      </Button>
    </div>
  );
}
