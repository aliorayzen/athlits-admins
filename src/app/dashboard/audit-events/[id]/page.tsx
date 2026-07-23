"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Braces,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  Network,
  RefreshCw,
  Shield,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { getApiErrorMessage, getAuditEvent } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AuditEvent } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  auditActionTone,
  auditActorLabel,
  auditInitials,
  auditOutcomeTone,
  auditTargetLabel,
  formatAuditJson,
  formatAuditTimestamp,
  humanizeAuditValue,
} from "../_lib/audit-format";

export default function AuditEventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const [event, setEvent] = useState<AuditEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const response = await getAuditEvent(eventId);
        if (cancelled) return;
        setEvent(response);
        setError("");
      } catch (loadError: unknown) {
        if (cancelled) return;
        setEvent(null);
        setError(
          getApiErrorMessage(loadError, "Could not load this audit event."),
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [eventId, reloadToken]);

  if (isLoading) return <AuditEventDetailSkeleton />;
  if (!event) {
    return (
      <AuditEventDetailError
        message={error}
        onRetry={() => setReloadToken((token) => token + 1)}
      />
    );
  }

  return <AuditEventDetail event={event} />;
}

function AuditEventDetail({ event }: { event: AuditEvent }) {
  const outcome = auditOutcomeTone(event.outcome);
  const hasChanges = event.before != null || event.after != null;
  const hasMetadata = event.metadata != null;

  return (
    <div className="audit-event-detail-v2 space-y-5">
      <header className="space-y-4">
        <Link
          href="/dashboard/audit-events"
          className="inline-flex items-center gap-1.5 rounded-md text-[12.5px] font-medium text-[var(--text-3)] transition-colors hover:text-[var(--teal-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Audit events
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-1 text-[10.5px] font-semibold",
                  auditActionTone(event.action),
                )}
              >
                {humanizeAuditValue(event.action)}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10.5px] font-medium",
                  outcome.pill,
                )}
              >
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", outcome.dot)}
                />
                {outcome.label}
              </span>
            </div>
            <h1 className="truncate text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-1)]">
              {auditTargetLabel(event)}
            </h1>
            <p className="mt-1.5 font-mono text-[11px] text-[var(--text-4)]">
              Event {event.id}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-1)] px-3 py-2.5">
            <Clock3 className="h-4 w-4 text-[var(--teal-text)]" />
            <div>
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
                Recorded
              </p>
              <p className="mt-0.5 font-mono text-[11.5px] tabular-nums text-[var(--text-2)]">
                {formatAuditTimestamp(event.occurredAt, true)}
              </p>
            </div>
          </div>
        </div>
      </header>

      {event.reason && (
        <div className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-1)] px-4 py-3.5">
          <Activity className="mt-0.5 h-4 w-4 shrink-0 text-[var(--teal-text)]" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
              Event note
            </p>
            <p className="mt-1 text-[13px] leading-5 text-[var(--text-2)]">
              {event.reason}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)]">
            <SectionHeading
              icon={Activity}
              title="Event record"
              subtitle="The action and record captured by the platform."
            />
            <dl className="grid sm:grid-cols-2">
              <DetailField label="Event ID" mono copyValue={event.id}>
                {event.id}
              </DetailField>
              <DetailField label="Action">
                {humanizeAuditValue(event.action)}
              </DetailField>
              <DetailField label="Entity type">
                {humanizeAuditValue(event.entityType)}
              </DetailField>
              <DetailField
                label="Entity ID"
                mono
                copyValue={event.entityId ?? undefined}
              >
                {event.entityId ?? "Not recorded"}
              </DetailField>
              <DetailField label="Outcome">{outcome.label}</DetailField>
              <DetailField label="Occurred at" mono>
                {formatAuditTimestamp(event.occurredAt, true)}
              </DetailField>
            </dl>
          </section>

          {hasChanges ? (
            <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)]">
              <SectionHeading
                icon={Braces}
                title="Change set"
                subtitle="Values captured before and after the action."
              />
              <div className="grid gap-px bg-[var(--border)] lg:grid-cols-2">
                <JsonPanel
                  label="Before"
                  value={event.before}
                  tone="neutral"
                />
                <JsonPanel label="After" value={event.after} tone="teal" />
              </div>
            </section>
          ) : hasMetadata ? (
            <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)]">
              <SectionHeading
                icon={Braces}
                title="Event data"
                subtitle="Structured context stored with this event."
              />
              <JsonPanel label="Metadata" value={event.metadata} tone="teal" />
            </section>
          ) : (
            <section className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-1)] px-4 py-5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--bg-2)]">
                <Braces className="h-4 w-4 text-[var(--text-4)]" />
              </div>
              <div>
                <h2 className="text-[13px] font-semibold text-[var(--text-2)]">
                  No structured payload
                </h2>
                <p className="mt-0.5 text-[11.5px] text-[var(--text-4)]">
                  This event was recorded without metadata or a change set.
                </p>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)]">
            <SectionHeading
              icon={UserRound}
              title="Actor"
              subtitle="Identity that initiated the event."
            />
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[rgba(0,212,170,0.16)] bg-[var(--teal-subtle)] text-[11px] font-semibold text-[var(--teal-text)]">
                {auditInitials(event)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[var(--text-1)]">
                  {auditActorLabel(event)}
                </p>
                <p className="mt-0.5 text-[10.5px] text-[var(--text-4)]">
                  {humanizeAuditValue(event.actorRole)}
                </p>
              </div>
            </div>
            <dl>
              <CompactField label="Email" value={event.actorEmail} />
              <CompactField label="User ID" value={event.actorId} mono />
              <CompactField label="Role" value={event.actorRole} />
            </dl>
          </section>

          <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)]">
            <SectionHeading
              icon={Network}
              title="Request context"
              subtitle="Network and request data captured at the time."
            />
            <dl>
              <CompactField
                label="Endpoint"
                value={
                  [event.requestMethod, event.requestPath]
                    .filter(Boolean)
                    .join(" ") || null
                }
                mono
              />
              <CompactField
                label="IP address"
                value={event.ipAddress}
                mono
              />
              <CompactField
                label="Trace ID"
                value={event.traceId}
                mono
                copyValue={event.traceId ?? undefined}
              />
              <CompactField label="User agent" value={event.userAgent} />
            </dl>
          </section>

          <details className="group overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--teal)]">
              <div className="flex items-center gap-2.5">
                <Shield className="h-4 w-4 text-[var(--text-4)]" />
                <span className="text-[12px] font-semibold text-[var(--text-2)]">
                  Raw event
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-[var(--text-4)] transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-[var(--border)] bg-[var(--bg-0)] p-3">
              <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words font-mono text-[10.5px] leading-[1.6] text-[var(--text-3)]">
                {formatAuditJson(event.raw)}
              </pre>
            </div>
          </details>
        </aside>
      </div>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Activity;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-[var(--border)] bg-white/[0.01] px-4 py-3.5">
      <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[var(--teal-subtle)] text-[var(--teal-text)]">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div>
        <h2 className="text-[13px] font-semibold text-[var(--text-1)]">
          {title}
        </h2>
        <p className="mt-0.5 text-[10.5px] text-[var(--text-4)]">{subtitle}</p>
      </div>
    </div>
  );
}

function DetailField({
  label,
  children,
  mono = false,
  copyValue,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
  copyValue?: string;
}) {
  return (
    <div className="min-w-0 border-b border-[var(--border)] px-4 py-3.5 odd:sm:border-r">
      <dt className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 flex min-w-0 items-center gap-2 break-all text-[12.5px] text-[var(--text-2)]",
          mono && "font-mono text-[11.5px]",
        )}
      >
        <span className="min-w-0">{children}</span>
        {copyValue && <CopyButton value={copyValue} label={label} />}
      </dd>
    </div>
  );
}

function CompactField({
  label,
  value,
  mono = false,
  copyValue,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  copyValue?: string;
}) {
  return (
    <div className="border-b border-[var(--border)] px-4 py-3 last:border-b-0">
      <dt className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 flex min-w-0 items-start gap-2 break-words text-[12px] leading-5 text-[var(--text-2)]",
          mono && "break-all font-mono text-[10.5px]",
        )}
      >
        <span className="min-w-0">{value || "Not recorded"}</span>
        {copyValue && <CopyButton value={copyValue} label={label} />}
      </dd>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${label.toLowerCase()}`}
      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded text-[var(--text-4)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--teal-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function JsonPanel({
  label,
  value,
  tone,
}: {
  label: string;
  value: unknown;
  tone: "neutral" | "teal";
}) {
  return (
    <div className="min-w-0 bg-[var(--bg-0)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            tone === "teal"
              ? "bg-[var(--teal)]"
              : "bg-[var(--text-4)]",
          )}
        />
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
          {label}
        </span>
      </div>
      <pre className="max-h-[440px] min-h-36 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[10.5px] leading-[1.65] text-[var(--text-3)]">
        {formatAuditJson(value)}
      </pre>
    </div>
  );
}

function AuditEventDetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-5 w-28" />
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-5 w-32 rounded-full" />
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-3 w-52" />
        </div>
        <Skeleton className="h-14 w-56" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)]">
        <div className="space-y-5">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-80 w-full rounded-lg" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function AuditEventDetailError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-5">
      <Link
        href="/dashboard/audit-events"
        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--text-3)] hover:text-[var(--teal-text)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Audit events
      </Link>
      <div className="flex flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--bg-1)] py-16 text-center">
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-[rgba(244,63,94,0.2)] bg-[var(--semantic-red-subtle)]">
          <AlertTriangle className="h-6 w-6 text-[var(--semantic-red)]" />
        </div>
        <h1 className="text-[15px] font-semibold text-[var(--text-1)]">
          Could not load this event
        </h1>
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
    </div>
  );
}
