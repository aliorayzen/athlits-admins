import type { AuditEvent, AuditEventOutcome } from "@/types/api";

export function humanizeAuditValue(value: string | null | undefined): string {
  if (!value) return "Not recorded";
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatAuditTimestamp(
  value: string | null | undefined,
  includeSeconds = false,
): string {
  if (!value) return "Time not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: includeSeconds ? "2-digit" : undefined,
  });
}

export function auditActorLabel(event: AuditEvent): string {
  return (
    event.actorName ??
    event.actorEmail ??
    (event.actorId ? `User ${event.actorId}` : "System")
  );
}

export function auditTargetLabel(event: AuditEvent): string {
  if (!event.entityType && !event.entityId) return "Platform";
  const type = humanizeAuditValue(event.entityType);
  return event.entityId ? `${type} ${event.entityId}` : type;
}

export function auditOutcomeTone(outcome: AuditEventOutcome): {
  dot: string;
  pill: string;
  label: string;
} {
  switch (outcome) {
    case "SUCCESS":
      return {
        dot: "bg-[var(--semantic-green)]",
        pill:
          "bg-[var(--semantic-green-subtle)] text-[var(--semantic-green)]",
        label: "Success",
      };
    case "FAILURE":
      return {
        dot: "bg-[var(--semantic-red)]",
        pill: "bg-[var(--semantic-red-subtle)] text-[var(--semantic-red)]",
        label: "Failure",
      };
    case "DENIED":
      return {
        dot: "bg-[var(--semantic-amber)]",
        pill:
          "bg-[var(--semantic-amber-subtle)] text-[var(--semantic-amber)]",
        label: "Denied",
      };
    default:
      return {
        dot: "bg-[var(--text-4)]",
        pill: "bg-white/[0.04] text-[var(--text-3)]",
        label: "Recorded",
      };
  }
}

export function auditActionTone(action: string): string {
  const normalized = action.toUpperCase();
  if (
    normalized.includes("DELETE") ||
    normalized.includes("DISABLE") ||
    normalized.includes("SUSPEND") ||
    normalized.includes("VOID")
  ) {
    return "bg-[var(--semantic-red-subtle)] text-[var(--semantic-red)]";
  }
  if (
    normalized.includes("UPDATE") ||
    normalized.includes("EDIT") ||
    normalized.includes("CHANGE")
  ) {
    return "bg-[var(--semantic-amber-subtle)] text-[var(--semantic-amber)]";
  }
  if (
    normalized.includes("CREATE") ||
    normalized.includes("RESTORE") ||
    normalized.includes("ACTIVATE")
  ) {
    return "bg-[var(--teal-subtle)] text-[var(--teal-text)]";
  }
  return "bg-[rgba(99,102,241,0.1)] text-[var(--semantic-blue)]";
}

export function auditInitials(event: AuditEvent): string {
  const label = auditActorLabel(event);
  if (label === "System") return "SY";
  const parts = label.split(/[\s@._-]+/).filter(Boolean);
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase() || "AU";
}

export function formatAuditJson(value: unknown): string {
  if (value === undefined || value === null) return "No data recorded";
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
