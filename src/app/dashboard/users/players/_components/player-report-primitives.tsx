import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MoneyAmount, PageResponse } from "@/types/api";

export function formatDate(value: string | null | undefined): string {
  if (!value) return "Never";
  const day = value.slice(0, 10);
  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function MoneyList({
  amounts,
  muted = false,
  empty = "None",
}: {
  amounts: MoneyAmount[];
  muted?: boolean;
  empty?: string;
}) {
  if (amounts.length === 0) {
    return <span className="text-[11px] text-[var(--text-4)]">{empty}</span>;
  }

  return (
    <span className="flex flex-col gap-0.5">
      {amounts.map((amount, index) => (
        <span
          key={`${amount.currencyCode}-${index}`}
          className={cn(
            "whitespace-nowrap font-mono text-[11.5px] tabular-nums",
            muted ? "text-[var(--text-4)]" : "text-[var(--text-2)]",
          )}
        >
          {amount.currencyCode}{" "}
          {new Intl.NumberFormat("en-US", {
            maximumFractionDigits: 2,
          }).format(amount.amount)}
        </span>
      ))}
    </span>
  );
}

type StatusTone = "green" | "red" | "amber" | "blue" | "neutral";

function statusTone(status: string): StatusTone {
  if (["ACTIVE", "COMPLETED", "CONFIRMED", "PAID"].includes(status)) {
    return "green";
  }
  if (["CANCELLED", "FAILED", "DISABLED", "NO_SHOW"].includes(status)) {
    return "red";
  }
  if (["MIXED", "REFUNDED", "PARTIALLY_REFUNDED"].includes(status)) {
    return "amber";
  }
  if (status.startsWith("PENDING")) return "blue";
  return "neutral";
}

const STATUS_CLASSES: Record<StatusTone, string> = {
  green:
    "bg-[rgba(16,185,129,0.09)] text-[var(--semantic-green)] border-[rgba(16,185,129,0.16)]",
  red: "bg-[var(--semantic-red-subtle)] text-[var(--semantic-red)] border-[rgba(244,63,94,0.16)]",
  amber:
    "bg-[var(--semantic-amber-subtle)] text-[var(--semantic-amber)] border-[rgba(245,158,11,0.16)]",
  blue: "bg-[rgba(99,102,241,0.1)] text-[var(--semantic-blue)] border-[rgba(99,102,241,0.16)]",
  neutral:
    "bg-[var(--bg-2)] text-[var(--text-3)] border-[var(--border)]",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full border px-2 py-[3px] text-[10.5px] font-medium leading-none",
        STATUS_CLASSES[statusTone(status)],
      )}
    >
      {humanize(status)}
    </span>
  );
}

export function Pagination({
  data,
  disabled,
  onPage,
}: {
  data: PageResponse<unknown>;
  disabled: boolean;
  onPage: (page: number) => void;
}) {
  const totalPages = Math.max(1, data.totalPages);
  const current = data.number;
  const start = data.totalElements === 0 ? 0 : current * data.size + 1;
  const end = Math.min(data.totalElements, start + data.content.length - 1);
  if (data.totalElements === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-[var(--border)] bg-white/[0.008] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="font-mono text-[11.5px] tabular-nums text-[var(--text-4)]">
        Showing {start}–{end} of {data.totalElements}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <PageButton
            label="Previous page"
            disabled={disabled || current === 0}
            onClick={() => onPage(current - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </PageButton>
          <span className="min-w-20 text-center font-mono text-[11.5px] tabular-nums text-[var(--text-3)]">
            {current + 1} / {totalPages}
          </span>
          <PageButton
            label="Next page"
            disabled={disabled || current + 1 >= totalPages}
            onClick={() => onPage(current + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </PageButton>
        </div>
      )}
    </div>
  );
}

function PageButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-md border border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-3)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
