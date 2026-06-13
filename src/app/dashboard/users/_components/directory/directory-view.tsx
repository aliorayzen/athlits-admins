"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownUp,
  Ban,
  ChevronLeft,
  ChevronRight,
  Clock,
  Phone,
  RefreshCw,
  Search,
  UserPlus,
} from "lucide-react";

import type { UserDto } from "@/types/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { PAGE_SIZE, type UserDirectory } from "./use-user-directory";

/* ─── Accent: set as CSS vars on the root so Tailwind classes stay static ─── */

export type Accent = "amber" | "teal" | "blue";

const ACCENT_VARS: Record<Accent, Record<string, string>> = {
  amber: {
    "--accent": "#f59e0b",
    "--accent-dark": "#d97706",
    "--accent-subtle": "rgba(245,158,11,0.1)",
    "--accent-ring": "rgba(245,158,11,0.3)",
    "--accent-on": "#231405",
    "--accent-glow": "rgba(245,158,11,0.4)",
  },
  teal: {
    "--accent": "#00d4aa",
    "--accent-dark": "#00b894",
    "--accent-subtle": "rgba(0,212,170,0.1)",
    "--accent-ring": "rgba(0,212,170,0.3)",
    "--accent-on": "#032921",
    "--accent-glow": "rgba(0,212,170,0.35)",
  },
  blue: {
    "--accent": "#6366f1",
    "--accent-dark": "#4f46e5",
    "--accent-subtle": "rgba(99,102,241,0.1)",
    "--accent-ring": "rgba(99,102,241,0.3)",
    "--accent-on": "#f5f6ff",
    "--accent-glow": "rgba(99,102,241,0.4)",
  },
};

const ACCENT_GRADIENT =
  "linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)";

/* ─── Shared helpers ─── */

export type StatusBucket = "active" | "pending" | "disabled";

export function statusBucket(status: UserDto["status"]): StatusBucket {
  if (status === "ACTIVE") return "active";
  if (status === "DISABLED") return "disabled";
  return "pending";
}

function initialsOf(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "U";
}

function avatarGradient(id: string): "g1" | "g2" | "g3" | "g4" | "g5" | "g6" {
  const sum = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const variants = ["g1", "g2", "g3", "g4", "g5", "g6"] as const;
  return variants[sum % variants.length];
}

/* ─── Public component ─── */

export interface DirectoryViewProps {
  dir: UserDirectory;
  accent: Accent;
  title: string;
  subtitle: string;
  /** Singular noun for the first column header ("Manager" / "Player"). */
  personLabel: string;
  /** ID column header ("Manager ID" / "Player ID"). */
  idLabel: string;
  /** Plural lowercase noun for empty/error copy ("venue managers" / "players"). */
  noun: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyBody: string;
  /** Optional create affordance. Omit for read-only directories. */
  create?: { href: string; label: string };
  /** Optional per-row actions cell. Omit to hide the Actions column entirely. */
  renderActions?: (user: UserDto) => React.ReactNode;
}

export function DirectoryView(props: DirectoryViewProps) {
  const { dir, accent } = props;
  const total = dir.data?.totalElements ?? 0;
  const accentStyle = ACCENT_VARS[accent] as unknown as CSSProperties;

  return (
    <div className="users-v2 user-directory-v2 space-y-5" style={accentStyle}>
      <Header
        title={props.title}
        subtitle={props.subtitle}
        total={total}
        showCount={dir.phase === "ready"}
        create={props.create}
      />

      <Toolbar dir={dir} placeholder={props.searchPlaceholder} />

      <Body {...props} />
    </div>
  );
}

/* ─── Header ─── */

function Header({
  title,
  subtitle,
  total,
  showCount,
  create,
}: {
  title: string;
  subtitle: string;
  total: number;
  showCount: boolean;
  create?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-1)]">
            {title}
          </h1>
          {showCount && (
            <span className="uv2-count-pill inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-1)] px-2 py-[2px] font-mono text-[11px] font-medium tabular-nums text-[var(--text-3)]">
              {total}
            </span>
          )}
        </div>
        <p className="text-[13px] tracking-[-0.003em] text-[var(--text-3)]">
          {subtitle}
        </p>
      </div>
      {create && (
        <Link href={create.href}>
          <Button
            style={{ background: ACCENT_GRADIENT }}
            className="gap-1.5 border border-[var(--accent-ring)] px-4 text-[13px] font-semibold text-[var(--accent-on)] shadow-[0_0_20px_-6px_var(--accent-glow)] transition-transform hover:-translate-y-px"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {create.label}
          </Button>
        </Link>
      )}
    </div>
  );
}

/* ─── Toolbar ─── */

function Toolbar({
  dir,
  placeholder,
}: {
  dir: UserDirectory;
  placeholder: string;
}) {
  const disabled = dir.phase === "error";
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="inline-flex items-center gap-2">
        <ArrowDownUp className="h-3.5 w-3.5 text-[var(--text-4)]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
          Sort
        </span>
        <div className="inline-flex items-center gap-[2px] rounded-md border border-[var(--border)] bg-[var(--bg-1)] p-[2px]">
          {dir.sortOptions.map((o) => (
            <button
              key={o.key}
              type="button"
              aria-pressed={dir.sort === o.key}
              disabled={disabled}
              onClick={() => dir.setSort(o.key)}
              className={cn(
                "rounded px-2.5 py-1.5 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                dir.sort === o.key
                  ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                  : "text-[var(--text-3)] hover:text-[var(--text-1)]",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full sm:max-w-[320px]">
        <Search className="pointer-events-none absolute left-[11px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[var(--text-4)]" />
        <input
          type="search"
          aria-label={placeholder}
          placeholder={placeholder}
          value={dir.search}
          disabled={disabled}
          onChange={(e) => dir.setSearch(e.target.value)}
          className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--bg-1)] pl-[34px] pr-3 text-[12.5px] text-[var(--text-1)] outline-none transition-all placeholder:text-[var(--text-4)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
    </div>
  );
}

/* ─── Body ─── */

function Body(props: DirectoryViewProps) {
  const { dir } = props;
  if (dir.phase === "loading")
    return <TableSkeleton hasActions={Boolean(props.renderActions)} />;
  if (dir.phase === "error")
    return (
      <ErrorState
        noun={props.noun}
        message={dir.errorMessage}
        onRetry={dir.retry}
      />
    );

  const rows = dir.data?.content ?? [];
  if (rows.length === 0) {
    return dir.search.trim().length > 0 ? (
      <EmptyFiltered noun={props.noun} onClear={() => dir.setSearch("")} />
    ) : (
      <EmptyNone
        title={props.emptyTitle}
        body={props.emptyBody}
        create={props.create}
      />
    );
  }

  const hasActions = Boolean(props.renderActions);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)] transition-opacity",
        dir.isFetching && "opacity-60",
      )}
      aria-busy={dir.isFetching}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">
          <thead className="bg-white/[0.012]">
            <tr>
              <Th className="pl-4">{props.personLabel}</Th>
              <Th>Phone</Th>
              <Th>Status</Th>
              <Th className={hasActions ? "" : "pr-4"}>{props.idLabel}</Th>
              {hasActions && <Th className="pr-4 text-right">Actions</Th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <Row key={u.id} user={u} actions={props.renderActions?.(u)} />
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar dir={dir} />
    </div>
  );
}

/* ─── Row ─── */

function Row({ user, actions }: { user: UserDto; actions?: React.ReactNode }) {
  const bucket = statusBucket(user.status);
  const gradient = avatarGradient(user.id);
  const initials = initialsOf(user.firstName, user.lastName);
  const fullName =
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Unnamed user";

  return (
    <tr className="uv2-tr group transition-colors hover:bg-[rgba(255,255,255,0.015)]">
      <td className="border-t border-[rgba(255,255,255,0.035)] px-4 py-3 align-middle">
        <div className="flex min-w-[240px] items-center gap-2.5">
          <div
            className={cn(
              "uv2-avatar",
              `uv2-${gradient}`,
              bucket !== "active" && "opacity-70",
            )}
          >
            {initials}
            <span
              className={cn(
                "uv2-presence",
                bucket === "active" && "uv2-presence-active",
                bucket === "pending" && "uv2-presence-pending",
                bucket === "disabled" && "uv2-presence-disabled",
              )}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-[1px]">
            <span
              className={cn(
                "truncate text-[13.5px] font-medium leading-[1.25] tracking-[-0.005em]",
                bucket === "active"
                  ? "text-[var(--text-1)]"
                  : "text-[var(--text-2)]",
              )}
            >
              {fullName}
            </span>
            <span className="truncate font-mono text-[11px] text-[var(--text-4)]">
              {user.email}
            </span>
          </div>
        </div>
      </td>
      <td className="border-t border-[rgba(255,255,255,0.035)] px-4 py-3 align-middle">
        {user.phoneNumber ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-[var(--text-2)]">
            <Phone className="h-[11px] w-[11px] text-[var(--text-4)]" />
            {user.phoneNumber}
          </span>
        ) : (
          <span className="text-[12px] text-[var(--text-4)]">—</span>
        )}
      </td>
      <td className="border-t border-[rgba(255,255,255,0.035)] px-4 py-3 align-middle">
        <StatusPill bucket={bucket} />
      </td>
      <td className="border-t border-[rgba(255,255,255,0.035)] px-4 py-3 align-middle">
        <span className="font-mono text-[12px] tabular-nums text-[var(--text-3)]">
          #{user.id}
        </span>
      </td>
      {actions !== undefined && (
        <td className="border-t border-[rgba(255,255,255,0.035)] px-4 py-3 text-right align-middle">
          {actions}
        </td>
      )}
    </tr>
  );
}

export function StatusPill({ bucket }: { bucket: StatusBucket }) {
  if (bucket === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[rgba(16,185,129,0.08)] py-[3px] pl-[7px] pr-[9px] text-[11px] font-medium leading-[1.3] text-[var(--semantic-green)]">
        <span className="uv2-status-dot-active h-[5px] w-[5px] rounded-full bg-[var(--semantic-green)] shadow-[0_0_5px_var(--semantic-green)]" />
        Active
      </span>
    );
  }
  if (bucket === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[rgba(99,102,241,0.1)] py-[3px] pl-[7px] pr-[9px] text-[11px] font-medium leading-[1.3] text-[var(--semantic-blue)]">
        <Clock className="h-[10px] w-[10px]" />
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/[0.04] py-[3px] pl-[7px] pr-[9px] text-[11px] font-medium leading-[1.3] text-[var(--text-4)]">
      <Ban className="h-[10px] w-[10px]" />
      Disabled
    </span>
  );
}

/* ─── Pagination ─── */

function PaginationBar({ dir }: { dir: UserDirectory }) {
  const data = dir.data;
  if (!data) return null;

  const pageIndex = data.number; // 0-based
  const totalPages = Math.max(1, data.totalPages);
  const total = data.totalElements;
  const onPage = data.numberOfElements ?? data.content.length;
  const start = total === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const end = pageIndex * PAGE_SIZE + onPage;

  const isFirst = data.first ?? pageIndex === 0;
  const isLast = data.last ?? pageIndex + 1 >= totalPages;

  return (
    <div className="flex flex-col gap-2 border-t border-[var(--border)] bg-white/[0.008] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="font-mono text-[12px] tabular-nums text-[var(--text-4)]">
        {total === 0 ? "No results" : `Showing ${start}–${end} of ${total}`}
      </span>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <PageButton
            disabled={isFirst || dir.isFetching}
            onClick={() => dir.goToPage(pageIndex - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-[14px] w-[14px]" />
          </PageButton>

          {pageWindow(pageIndex, totalPages).map((p, i) =>
            p === "…" ? (
              <span
                key={`gap-${i}`}
                className="px-1 font-mono text-[12px] text-[var(--text-4)]"
              >
                …
              </span>
            ) : (
              <PageButton
                key={p}
                active={p === pageIndex}
                disabled={dir.isFetching}
                onClick={() => dir.goToPage(p)}
                aria-label={`Page ${p + 1}`}
                aria-current={p === pageIndex ? "page" : undefined}
              >
                {p + 1}
              </PageButton>
            ),
          )}

          <PageButton
            disabled={isLast || dir.isFetching}
            onClick={() => dir.goToPage(pageIndex + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-[14px] w-[14px]" />
          </PageButton>
        </div>
      )}
    </div>
  );
}

/** Compact page window: first, current ±1, last, with ellipsis gaps. */
function pageWindow(current: number, totalPages: number): (number | "…")[] {
  const pages = new Set<number>([
    0,
    totalPages - 1,
    current - 1,
    current,
    current + 1,
  ]);
  const sorted = [...pages]
    .filter((p) => p >= 0 && p < totalPages)
    .sort((a, b) => a - b);

  const out: (number | "…")[] = [];
  let prev = -1;
  for (const p of sorted) {
    if (prev !== -1 && p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

function PageButton({
  children,
  active,
  disabled,
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
} & React.AriaAttributes) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      {...rest}
      className={cn(
        "grid h-7 min-w-7 place-items-center rounded-md border px-1.5 font-mono text-[12px] tabular-nums transition-all disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "border-[var(--accent-ring)] bg-[var(--accent-subtle)] text-[var(--accent)]"
          : "border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-3)] hover:border-[var(--border-strong)] hover:text-[var(--text-1)]",
      )}
    >
      {children}
    </button>
  );
}

/* ─── Shared bits + states ─── */

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
        "select-none whitespace-nowrap border-b border-[var(--border)] px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]",
        className,
      )}
    >
      {children}
    </th>
  );
}

function TableSkeleton({ hasActions }: { hasActions: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)]">
      <div className="divide-y divide-[rgba(255,255,255,0.035)]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-52" />
            </div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-16" />
            {hasActions && <Skeleton className="h-7 w-24 rounded-md" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({
  noun,
  message,
  onRetry,
}: {
  noun: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-1)] py-16">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(244,63,94,0.25)] bg-[var(--semantic-red-subtle)]">
        <AlertTriangle className="h-6 w-6 text-[var(--semantic-red)]" />
      </div>
      <p className="text-base font-medium text-[var(--text-1)]">
        Couldn&apos;t load {noun}
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

function EmptyFiltered({
  noun,
  onClear,
}: {
  noun: string;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-1)] py-16">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-2)]">
        <Search className="h-6 w-6 text-[var(--text-4)]" />
      </div>
      <p className="text-base font-medium text-[var(--text-1)]">
        No matching {noun}
      </p>
      <p className="mt-1 text-sm text-[var(--text-3)]">
        Try a different search term
      </p>
      <Button
        variant="outline"
        onClick={onClear}
        className="mt-4 border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-2)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]"
      >
        Clear search
      </Button>
    </div>
  );
}

function EmptyNone({
  title,
  body,
  create,
}: {
  title: string;
  body: string;
  create?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--bg-1)] py-16">
      <div className="relative mb-5">
        <div className="absolute -inset-3 rounded-3xl bg-[var(--accent-subtle)] blur-xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] ring-1 ring-[var(--accent-ring)]">
          <UserPlus className="h-7 w-7 text-[var(--accent)]" />
        </div>
      </div>
      <p className="text-base font-medium text-[var(--text-1)]">{title}</p>
      <p className="mt-1.5 max-w-sm text-center text-sm text-[var(--text-3)]">
        {body}
      </p>
      {create && (
        <Link href={create.href} className="mt-5">
          <Button
            style={{ background: ACCENT_GRADIENT }}
            className="gap-1.5 border border-[var(--accent-ring)] px-6 font-semibold text-[var(--accent-on)] shadow-[0_0_24px_-4px_var(--accent-glow)] transition-transform hover:-translate-y-px"
          >
            <UserPlus className="h-4 w-4" />
            {create.label}
          </Button>
        </Link>
      )}
    </div>
  );
}
