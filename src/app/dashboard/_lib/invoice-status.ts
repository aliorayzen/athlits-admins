import type { InvoiceStatus } from "@/types/api";

// Each helper has a default branch so unknown/missing statuses from the
// backend render with neutral styling rather than producing `undefined` and
// breaking the className string interpolation.

const NEUTRAL_PILL =
  "bg-[rgba(255,255,255,0.04)] text-[var(--text-3)] border-[var(--border)]";
const NEUTRAL_DOT = "bg-[var(--text-4)]";

export function statusStyles(
  status: InvoiceStatus | string | undefined,
): string {
  switch (status) {
    case "PAID":
      return "bg-[var(--teal-subtle)] text-[var(--teal-text)] border-[rgba(0,212,170,0.22)]";
    case "GENERATED":
      return "bg-[rgba(245,158,11,0.14)] text-[#fcd34d] border-[rgba(245,158,11,0.26)]";
    case "OVERDUE":
    case "VOID":
      return "bg-[rgba(244,63,94,0.14)] text-[#fda4af] border-[rgba(244,63,94,0.26)]";
    default:
      return NEUTRAL_PILL;
  }
}

export function statusDotStyles(
  status: InvoiceStatus | string | undefined,
): string {
  switch (status) {
    case "PAID":
      return "bg-[var(--teal)] shadow-[0_0_6px_rgba(0,212,170,0.35)] pulse-dot";
    case "GENERATED":
      return "bg-[#f59e0b] pulse-dot";
    case "OVERDUE":
    case "VOID":
      return "bg-[#f43f5e]";
    default:
      return NEUTRAL_DOT;
  }
}

export function statusLabel(
  status: InvoiceStatus | string | undefined,
): string {
  switch (status) {
    case "PAID":
      return "Paid";
    case "GENERATED":
      return "Pending";
    case "OVERDUE":
      return "Overdue";
    case "VOID":
      return "Void";
    default:
      return status ? String(status) : "Unknown";
  }
}
