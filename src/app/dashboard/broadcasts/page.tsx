"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Loader2,
  Megaphone,
  RefreshCw,
  Send,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import {
  estimateBroadcastAudience,
  getBroadcast,
  getBroadcasts,
  sendBroadcast,
  type AudienceEstimateQuery,
  type BroadcastAudience,
  type BroadcastRecord,
  type BroadcastRequest,
  type BroadcastStatus,
} from "@/lib/broadcasts";
import { getApiErrorMessage, getApiFieldErrorMap } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PageResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PAGE_SIZE = 20;

interface Draft {
  audience: BroadcastAudience;
  title: string;
  body: string;
  userIds: string;
  sport: string;
  activeWithinDays: string;
}

type AudienceDraft = Pick<
  Draft,
  "audience" | "userIds" | "sport" | "activeWithinDays"
>;

const EMPTY_DRAFT: Draft = {
  audience: "ALL_PLAYERS",
  title: "",
  body: "",
  userIds: "",
  sport: "",
  activeWithinDays: "",
};

function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

function parseUserIds(value: string): number[] {
  return Array.from(
    new Set(
      value
        .split(/[\s,]+/)
        .map((part) => Number(part.trim()))
        .filter((id) => Number.isSafeInteger(id) && id > 0),
    ),
  );
}

function buildAudienceQuery(
  draft: AudienceDraft,
): AudienceEstimateQuery | null {
  if (draft.audience === "ALL_PLAYERS") return { audience: draft.audience };
  if (draft.audience === "USER_IDS") {
    const userIds = parseUserIds(draft.userIds);
    if (userIds.length === 0 || userIds.length > 1000) return null;
    return { audience: draft.audience, userIds };
  }
  const sport = draft.sport.trim().toUpperCase();
  const days = Number(draft.activeWithinDays);
  const hasDays =
    draft.activeWithinDays.trim().length > 0 &&
    Number.isInteger(days) &&
    days > 0;
  if (!sport && !hasDays) return null;
  return {
    audience: draft.audience,
    ...(sport ? { sport } : {}),
    ...(hasDays ? { activeWithinDays: days } : {}),
  };
}

function buildRequest(draft: Draft): BroadcastRequest {
  const audience = buildAudienceQuery(draft);
  return {
    ...(audience ?? { audience: draft.audience }),
    title: draft.title.trim(),
    body: draft.body.trim(),
  };
}

function validateDraft(draft: Draft): Record<string, string> {
  const errors: Record<string, string> = {};
  const titleLength = draft.title.trim().length;
  const bodyLength = draft.body.trim().length;
  if (titleLength < 3 || titleLength > 120) {
    errors.title = "Use between 3 and 120 characters.";
  }
  if (bodyLength < 12 || bodyLength > 300) {
    errors.body = "Use between 12 and 300 characters.";
  }
  if (draft.audience === "USER_IDS") {
    const userIds = parseUserIds(draft.userIds);
    if (userIds.length === 0) errors.userIds = "Enter at least one player ID.";
    else if (userIds.length > 1000)
      errors.userIds = "Limit this audience to 1,000 player IDs.";
  }
  if (draft.audience === "SEGMENT") {
    const hasSport = draft.sport.trim().length > 0;
    const days = Number(draft.activeWithinDays);
    const hasDays = draft.activeWithinDays.trim().length > 0;
    if (!hasSport && !hasDays)
      errors.segment = "Add a sport, an activity window, or both.";
    if (hasDays && (!Number.isInteger(days) || days < 1)) {
      errors.activeWithinDays =
        "Enter a whole number of days greater than zero.";
    }
  }
  return errors;
}

function audienceLabel(record: Pick<BroadcastRecord, "audience">): string {
  if (record.audience === "ALL_PLAYERS") return "All players";
  if (record.audience === "USER_IDS") return "Selected players";
  return "Player segment";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-LB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Beirut",
  }).format(date);
}

export default function BroadcastsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [estimate, setEstimate] = useState<number | null>(null);
  const [estimateError, setEstimateError] = useState("");
  const [isEstimating, setIsEstimating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState<BroadcastRecord | null>(null);
  const [history, setHistory] = useState<PageResponse<BroadcastRecord> | null>(
    null,
  );
  const [historyError, setHistoryError] = useState("");
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isHistoryFetching, setIsHistoryFetching] = useState(false);
  const [page, setPage] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const historySequence = useRef(0);

  useEffect(() => {
    setIdempotencyKey(newIdempotencyKey());
  }, []);

  const audienceQuery = useMemo(
    () =>
      buildAudienceQuery({
        audience: draft.audience,
        userIds: draft.userIds,
        sport: draft.sport,
        activeWithinDays: draft.activeWithinDays,
      }),
    [draft.audience, draft.userIds, draft.sport, draft.activeWithinDays],
  );

  useEffect(() => {
    if (!audienceQuery) {
      setEstimate(null);
      setEstimateError("");
      setIsEstimating(false);
      return;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setIsEstimating(true);
      setEstimateError("");
      try {
        const result = await estimateBroadcastAudience(audienceQuery);
        if (!active) return;
        setEstimate(result.recipientCount);
      } catch (error: unknown) {
        if (!active) return;
        setEstimate(null);
        setEstimateError(
          getApiErrorMessage(error, "Could not estimate this audience."),
        );
      } finally {
        if (active) setIsEstimating(false);
      }
    }, 350);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [audienceQuery]);

  const loadHistory = useCallback(async () => {
    const sequence = ++historySequence.current;
    setIsHistoryFetching(true);
    try {
      const result = await getBroadcasts(page, PAGE_SIZE);
      if (sequence !== historySequence.current) return;
      setHistory(result);
      setHistoryError("");
    } catch (error: unknown) {
      if (sequence !== historySequence.current) return;
      setHistoryError(
        getApiErrorMessage(error, "Could not load broadcast history."),
      );
    } finally {
      if (sequence === historySequence.current) {
        setIsHistoryLoading(false);
        setIsHistoryFetching(false);
      }
    }
  }, [page]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory, reloadToken]);

  const pendingBroadcastId =
    submitted && submitted.status !== "SENT" ? submitted.id : null;

  useEffect(() => {
    if (pendingBroadcastId === null) return;
    let active = true;
    const poll = async () => {
      try {
        const current = await getBroadcast(pendingBroadcastId);
        if (!active) return;
        setSubmitted(current);
        setHistory((existing) =>
          existing
            ? {
                ...existing,
                content: existing.content.map((item) =>
                  item.id === current.id ? current : item,
                ),
              }
            : existing,
        );
        if (current.status === "SENT") {
          toast.success("Broadcast sent", {
            description: `${current.acceptedRecipientCount.toLocaleString()} players received it.`,
          });
          setReloadToken((token) => token + 1);
        }
      } catch {
        // Keep the queued result visible. The next poll may recover.
      }
    };
    void poll();
    const timer = window.setInterval(poll, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [pendingBroadcastId]);

  if (authLoading) return <BroadcastPageSkeleton />;
  if (user?.role !== "ADMIN") {
    return (
      <div
        role="alert"
        className="m-6 rounded-lg border border-[var(--border)] bg-[var(--bg-1)] p-6 text-sm text-[var(--text-2)]"
      >
        Access denied. Broadcasts require the ADMIN role.
      </div>
    );
  }

  const localErrors = validateDraft(draft);
  const canReview =
    Object.keys(localErrors).length === 0 &&
    estimate !== null &&
    estimate > 0 &&
    !isEstimating &&
    !isSending &&
    !submitted &&
    Boolean(idempotencyKey);

  function updateDraft(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setFieldErrors({});
    setSubmitError("");
  }

  function requestReview(event?: FormEvent) {
    event?.preventDefault();
    const errors = validateDraft(draft);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("Check the highlighted fields before continuing.");
      return;
    }
    if (estimate === null || estimate < 1 || isEstimating) {
      toast.error("Wait for a valid audience estimate before sending.");
      return;
    }
    setConfirmOpen(true);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      requestReview();
    }
  }

  async function confirmSend() {
    if (!idempotencyKey) return;
    setIsSending(true);
    setSubmitError("");
    try {
      const result = await sendBroadcast(buildRequest(draft), idempotencyKey);
      setSubmitted(result);
      setConfirmOpen(false);
      setHistory((existing) => {
        if (!existing) return existing;
        const alreadyListed = existing.content.some(
          (item) => item.id === result.id,
        );
        return {
          ...existing,
          content: [
            result,
            ...existing.content.filter((item) => item.id !== result.id),
          ].slice(0, PAGE_SIZE),
          totalElements: alreadyListed
            ? existing.totalElements
            : existing.totalElements + 1,
        };
      });
      toast.success("Broadcast queued", {
        description: `Delivery is starting for about ${result.estimatedRecipientCount.toLocaleString()} players.`,
      });
    } catch (error: unknown) {
      setConfirmOpen(false);
      setFieldErrors(getApiFieldErrorMap(error));
      setSubmitError(
        getApiErrorMessage(
          error,
          "Could not queue the broadcast. Retry with the same send attempt.",
        ),
      );
    } finally {
      setIsSending(false);
    }
  }

  function composeAnother() {
    setDraft(EMPTY_DRAFT);
    setFieldErrors({});
    setSubmitError("");
    setSubmitted(null);
    setIdempotencyKey(newIdempotencyKey());
    setEstimate(null);
    setEstimateError("");
  }

  return (
    <div className="broadcasts-page mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--teal-text)]">
            <CircleDot className="h-3 w-3" /> Platform communications
          </div>
          <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-[var(--text-1)]">
            Broadcasts
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-5 text-[var(--text-3)]">
            Send a platform notification to active players and track delivery
            from queue to completion.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setReloadToken((token) => token + 1)}
          disabled={isHistoryFetching}
          className="gap-1.5 border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-2)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]"
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", isHistoryFetching && "animate-spin")}
          />{" "}
          Refresh history
        </Button>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form
          onSubmit={requestReview}
          onKeyDown={handleComposerKeyDown}
          className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-1)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--text-1)]">
                Compose notification
              </h2>
              <p className="mt-0.5 text-[11.5px] text-[var(--text-4)]">
                One notification, visible in-app even without a registered
                device.
              </p>
            </div>
            <Megaphone className="h-5 w-5 text-[var(--teal-text)]" />
          </div>

          <div className="space-y-7 p-5 sm:p-6">
            <section>
              <SectionLabel number="01" title="Choose audience" />
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <AudienceOption
                  selected={draft.audience === "ALL_PLAYERS"}
                  title="All players"
                  description="Every active player"
                  onClick={() => updateDraft({ audience: "ALL_PLAYERS" })}
                />
                <AudienceOption
                  selected={draft.audience === "USER_IDS"}
                  title="Player IDs"
                  description="Up to 1,000 named players"
                  onClick={() => updateDraft({ audience: "USER_IDS" })}
                />
                <AudienceOption
                  selected={draft.audience === "SEGMENT"}
                  title="Segment"
                  description="Sport and recent activity"
                  onClick={() => updateDraft({ audience: "SEGMENT" })}
                />
              </div>

              {draft.audience === "USER_IDS" && (
                <Field
                  label="Player IDs"
                  error={fieldErrors.userIds}
                  className="mt-4"
                >
                  <textarea
                    value={draft.userIds}
                    onChange={(event) =>
                      updateDraft({ userIds: event.target.value })
                    }
                    placeholder="31, 32, 33"
                    rows={3}
                    aria-invalid={Boolean(fieldErrors.userIds)}
                    className="w-full resize-y rounded-md border border-[var(--border)] bg-[var(--bg-0)] px-3 py-2.5 font-mono text-[12.5px] text-[var(--text-1)] outline-none placeholder:text-[var(--text-4)] focus:border-[var(--teal)] focus:ring-[3px] focus:ring-[var(--teal-subtle)]"
                  />
                  <p className="mt-1 text-[10.5px] text-[var(--text-4)]">
                    Separate IDs with commas, spaces, or new lines.{" "}
                    {parseUserIds(draft.userIds).length.toLocaleString()} valid
                    unique IDs.
                  </p>
                </Field>
              )}

              {draft.audience === "SEGMENT" && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Sport"
                    error={fieldErrors.sport || fieldErrors.segment}
                  >
                    <input
                      value={draft.sport}
                      onChange={(event) =>
                        updateDraft({ sport: event.target.value.toUpperCase() })
                      }
                      placeholder="PADEL"
                      className={inputClass(
                        Boolean(fieldErrors.sport || fieldErrors.segment),
                      )}
                    />
                  </Field>
                  <Field
                    label="Active within days"
                    error={fieldErrors.activeWithinDays || fieldErrors.segment}
                  >
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={draft.activeWithinDays}
                      onChange={(event) =>
                        updateDraft({ activeWithinDays: event.target.value })
                      }
                      placeholder="30"
                      className={inputClass(
                        Boolean(
                          fieldErrors.activeWithinDays || fieldErrors.segment,
                        ),
                      )}
                    />
                  </Field>
                  <p className="text-[10.5px] leading-4 text-[var(--text-4)] sm:col-span-2">
                    Use either filter or both. Sport includes players who play
                    it or list it as an interest; activity means a successful
                    booking in that window.
                  </p>
                </div>
              )}
            </section>

            <section>
              <SectionLabel number="02" title="Write notification" />
              <div className="mt-3 space-y-4">
                <Field
                  label="Title"
                  required
                  error={fieldErrors.title}
                  meta={`${draft.title.length}/120`}
                >
                  <input
                    value={draft.title}
                    onChange={(event) =>
                      updateDraft({ title: event.target.value })
                    }
                    maxLength={120}
                    placeholder="Scheduled maintenance"
                    aria-invalid={Boolean(fieldErrors.title)}
                    className={inputClass(Boolean(fieldErrors.title))}
                  />
                </Field>
                <Field
                  label="Message"
                  required
                  error={fieldErrors.body}
                  meta={`${draft.body.length}/300`}
                >
                  <textarea
                    value={draft.body}
                    onChange={(event) =>
                      updateDraft({ body: event.target.value })
                    }
                    maxLength={300}
                    rows={5}
                    placeholder="Courts are unbookable tonight between 1am and 3am."
                    aria-invalid={Boolean(fieldErrors.body)}
                    className="w-full resize-y rounded-md border border-[var(--border)] bg-[var(--bg-0)] px-3 py-2.5 text-[13px] leading-5 text-[var(--text-1)] outline-none placeholder:text-[var(--text-4)] focus:border-[var(--teal)] focus:ring-[3px] focus:ring-[var(--teal-subtle)]"
                  />
                </Field>
              </div>
            </section>

            {submitError && (
              <div
                role="alert"
                className="rounded-lg border border-[rgb(var(--red-rgb)/0.2)] bg-[var(--semantic-red-subtle)] px-4 py-3 text-[12.5px] leading-5 text-[var(--red-text)]"
              >
                {submitError} The retry button keeps this compose attempt’s
                original idempotency key.
              </div>
            )}

            {submitted ? (
              <QueuedSummary
                record={submitted}
                onComposeAnother={composeAnother}
              />
            ) : (
              <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] text-[var(--text-4)]">
                  Press Ctrl/⌘ + Enter to review. Broadcasts cannot be cancelled
                  after queueing.
                </p>
                <Button
                  type="submit"
                  disabled={!canReview}
                  className="h-9 gap-2 bg-[var(--teal)] px-4 font-semibold text-[var(--on-teal)] hover:bg-[var(--teal)] hover:brightness-110"
                >
                  <Send className="h-3.5 w-3.5" />{" "}
                  {submitError ? "Retry send" : "Review and send"}
                </Button>
              </div>
            )}
          </div>
        </form>

        <AudienceEstimatePanel
          count={estimate}
          loading={isEstimating}
          error={estimateError}
          validQuery={Boolean(audienceQuery)}
        />
      </div>

      <HistorySection
        data={history}
        error={historyError}
        loading={isHistoryLoading}
        fetching={isHistoryFetching}
        onRetry={() => setReloadToken((token) => token + 1)}
        onPage={setPage}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-md border-[var(--border-strong)] bg-[var(--bg-1)] p-5">
          <AlertDialogHeader className="place-items-start text-left">
            <AlertDialogTitle className="text-[17px] text-[var(--text-1)]">
              Send this broadcast?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left text-[12.5px] leading-5 text-[var(--text-3)]">
              This action cannot be undone. The estimate is a current snapshot
              and may change while delivery runs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg-0)] p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[11px] text-[var(--text-4)]">Audience</span>
              <span className="text-[12px] font-medium text-[var(--text-1)]">
                {draft.audience === "ALL_PLAYERS"
                  ? "All players"
                  : draft.audience === "USER_IDS"
                    ? "Selected players"
                    : "Player segment"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[11px] text-[var(--text-4)]">
                Estimated recipients
              </span>
              <span className="font-mono text-[16px] font-semibold tabular-nums text-[var(--teal-text)]">
                {estimate?.toLocaleString() ?? "—"}
              </span>
            </div>
            <div className="border-t border-[var(--border)] pt-3">
              <p className="text-[12.5px] font-semibold text-[var(--text-1)]">
                {draft.title.trim()}
              </p>
              <p className="mt-1 text-[12px] leading-5 text-[var(--text-3)]">
                {draft.body.trim()}
              </p>
            </div>
          </div>
          <AlertDialogFooter className="border-[var(--border)] bg-[var(--bg-2)]">
            <AlertDialogCancel
              disabled={isSending}
              className="border-[var(--border-strong)] bg-[var(--bg-1)] text-[var(--text-2)]"
            >
              Go back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSend}
              disabled={isSending}
              className="bg-[var(--teal)] font-semibold text-[var(--on-teal)] hover:bg-[var(--teal)] hover:brightness-110"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Queueing
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Queue broadcast
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SectionLabel({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] font-semibold text-[var(--teal-text)]">
        {number}
      </span>
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--text-2)]">
        {title}
      </h3>
    </div>
  );
}

function AudienceOption({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "rounded-lg border p-3 text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-[var(--teal)]",
        selected
          ? "border-[rgb(var(--teal-rgb)/0.3)] bg-[var(--teal-subtle)]"
          : "border-[var(--border)] bg-[var(--bg-0)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-medium text-[var(--text-1)]">
          {title}
        </span>
        <span
          className={cn(
            "grid h-4 w-4 place-items-center rounded-full border",
            selected
              ? "border-[var(--teal)] bg-[var(--teal)] text-[var(--on-teal)]"
              : "border-[var(--border-strong)]",
          )}
        >
          {selected && <Check className="h-2.5 w-2.5" />}
        </span>
      </div>
      <p className="mt-1 text-[10.5px] leading-4 text-[var(--text-4)]">
        {description}
      </p>
    </button>
  );
}

function Field({
  label,
  required,
  error,
  meta,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  meta?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
        <span>
          {label}
          {required && <span className="text-[var(--red-text)]"> *</span>}
        </span>
        {meta && (
          <span className="font-mono font-normal normal-case tracking-normal">
            {meta}
          </span>
        )}
      </span>
      {children}
      {error && (
        <span
          role="alert"
          className="mt-1 block text-[10.5px] text-[var(--red-text)]"
        >
          {error}
        </span>
      )}
    </label>
  );
}

function inputClass(error: boolean): string {
  return cn(
    "h-[38px] w-full rounded-md border bg-[var(--bg-0)] px-3 text-[12.5px] text-[var(--text-1)] outline-none transition-all placeholder:text-[var(--text-4)] focus:border-[var(--teal)] focus:ring-[3px] focus:ring-[var(--teal-subtle)]",
    error ? "border-[var(--semantic-red)]" : "border-[var(--border)]",
  );
}

function AudienceEstimatePanel({
  count,
  loading,
  error,
  validQuery,
}: {
  count: number | null;
  loading: boolean;
  error: string;
  validQuery: boolean;
}) {
  return (
    <aside className="sticky top-6 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-1)]">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[var(--teal-text)]" />
          <h2 className="text-[13px] font-semibold text-[var(--text-1)]">
            Audience estimate
          </h2>
        </div>
        <p className="mt-1 text-[11px] leading-4 text-[var(--text-4)]">
          A snapshot for the current filters, not a delivery promise.
        </p>
      </div>
      <div className="p-5">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-3 w-full" />
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex gap-2 text-[11.5px] leading-5 text-[var(--red-text)]"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : count !== null ? (
          <>
            <div className="font-mono text-[34px] font-semibold tracking-[-0.04em] tabular-nums text-[var(--text-1)]">
              {count.toLocaleString()}
            </div>
            <p className="mt-1 text-[11.5px] text-[var(--text-3)]">
              active {count === 1 ? "player" : "players"} right now
            </p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--bg-3)]">
              <div className="h-full w-full rounded-full bg-[var(--teal)]" />
            </div>
          </>
        ) : (
          <p className="text-[11.5px] leading-5 text-[var(--text-4)]">
            {validQuery
              ? "Calculating the audience…"
              : "Complete the audience filters to retrieve a count."}
          </p>
        )}
      </div>
    </aside>
  );
}

function StatusProgress({ status }: { status: BroadcastStatus }) {
  const active = status === "QUEUED" ? 1 : status === "PROCESSING" ? 2 : 3;
  return (
    <div
      aria-label={`Broadcast status: ${status.toLowerCase()}`}
      className="flex w-28 gap-1"
    >
      {[1, 2, 3].map((step) => (
        <span
          key={step}
          className={cn(
            "h-1 flex-1 rounded-full",
            step <= active
              ? status === "SENT"
                ? "bg-[var(--semantic-green)]"
                : "bg-[var(--teal)]"
              : "bg-[var(--bg-3)]",
          )}
        />
      ))}
    </div>
  );
}

function QueuedSummary({
  record,
  onComposeAnother,
}: {
  record: BroadcastRecord;
  onComposeAnother: () => void;
}) {
  return (
    <div className="rounded-lg border border-[rgb(var(--teal-rgb)/0.22)] bg-[var(--teal-subtle)] p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                record.status === "SENT"
                  ? "bg-[var(--semantic-green)]"
                  : "animate-pulse bg-[var(--teal)]",
              )}
            />
            <p className="text-[13px] font-semibold text-[var(--text-1)]">
              {record.status === "SENT"
                ? "Broadcast sent"
                : record.status === "PROCESSING"
                  ? "Sending broadcast"
                  : "Broadcast queued"}
            </p>
          </div>
          <p className="mt-1 text-[11px] text-[var(--text-3)]">
            Broadcast #{record.id}. Status updates automatically every 5
            seconds.
          </p>
        </div>
        <StatusProgress status={record.status} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[rgb(var(--teal-rgb)/0.14)] pt-4">
        <Count label="Estimated" value={record.estimatedRecipientCount} />
        <Count label="Accepted" value={record.acceptedRecipientCount} />
        <Count label="Pushes queued" value={record.queuedDeliveryCount} />
      </div>
      {record.status === "SENT" &&
        record.acceptedRecipientCount > 0 &&
        record.queuedDeliveryCount === 0 && (
          <p className="mt-3 text-[10.5px] leading-4 text-[var(--text-3)]">
            No registered devices were found. Recipients can still read this
            notification in-app.
          </p>
        )}
      <Button
        type="button"
        variant="outline"
        onClick={onComposeAnother}
        className="mt-4 border-[rgb(var(--teal-rgb)/0.2)] bg-[var(--bg-1)] text-[var(--teal-text)] hover:bg-[var(--bg-2)]"
      >
        Compose another
      </Button>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-mono text-[17px] font-semibold tabular-nums text-[var(--text-1)]">
        {value.toLocaleString()}
      </div>
      <div className="mt-0.5 text-[9.5px] uppercase tracking-[0.06em] text-[var(--text-4)]">
        {label}
      </div>
    </div>
  );
}

function HistorySection({
  data,
  error,
  loading,
  fetching,
  onRetry,
  onPage,
}: {
  data: PageResponse<BroadcastRecord> | null;
  error: string;
  loading: boolean;
  fetching: boolean;
  onRetry: () => void;
  onPage: (page: number) => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--text-1)]">
            Broadcast history
          </h2>
          <p className="mt-0.5 text-[11px] text-[var(--text-4)]">
            Newest first. Recipient and device delivery counts are tracked
            separately.
          </p>
        </div>
        {fetching && (
          <span className="flex items-center gap-1.5 text-[10.5px] text-[var(--text-4)]">
            <Loader2 className="h-3 w-3 animate-spin" />
            Updating
          </span>
        )}
      </div>
      {loading ? (
        <HistorySkeleton />
      ) : error && !data ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-1)] py-12 text-center">
          <AlertTriangle className="mx-auto h-5 w-5 text-[var(--red-text)]" />
          <p className="mt-3 text-[12.5px] text-[var(--text-2)]">{error}</p>
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
            className="mt-4 border-[var(--border)] bg-[var(--bg-2)]"
          >
            Try again
          </Button>
        </div>
      ) : data && data.content.length > 0 ? (
        <div
          className={cn(
            "overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-1)] transition-opacity",
            fetching && "opacity-60",
          )}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-4)]">
                  {[
                    "Created",
                    "Notification",
                    "Audience",
                    "Status",
                    "Accepted",
                    "Pushes",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="border-b border-[var(--border)] px-4 py-3 font-semibold"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.content.map((record) => (
                  <tr key={record.id} className="hover:bg-[var(--tint-2)]">
                    <td className="border-t border-[var(--border)] px-4 py-3">
                      <div className="whitespace-nowrap font-mono text-[11px] text-[var(--text-2)]">
                        {formatDate(record.createdAt)}
                      </div>
                      <div className="mt-0.5 font-mono text-[9.5px] text-[var(--text-4)]">
                        #{record.id}
                      </div>
                    </td>
                    <td className="max-w-[410px] border-t border-[var(--border)] px-4 py-3">
                      <p className="truncate text-[12.5px] font-medium text-[var(--text-1)]">
                        {record.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-[var(--text-4)]">
                        {record.body}
                      </p>
                    </td>
                    <td className="border-t border-[var(--border)] px-4 py-3 text-[11.5px] text-[var(--text-3)]">
                      {audienceLabel(record)}
                    </td>
                    <td className="border-t border-[var(--border)] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusProgress status={record.status} />
                        <span className="text-[9.5px] font-semibold text-[var(--text-3)]">
                          {record.status}
                        </span>
                      </div>
                    </td>
                    <td className="border-t border-[var(--border)] px-4 py-3 font-mono text-[12px] tabular-nums text-[var(--text-2)]">
                      {record.acceptedRecipientCount.toLocaleString()}
                      <span className="ml-1 text-[9.5px] text-[var(--text-4)]">
                        est. {record.estimatedRecipientCount.toLocaleString()}
                      </span>
                    </td>
                    <td className="border-t border-[var(--border)] px-4 py-3 font-mono text-[12px] tabular-nums text-[var(--text-2)]">
                      {record.queuedDeliveryCount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <HistoryPagination data={data} disabled={fetching} onPage={onPage} />
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-1)] py-14 text-center">
          <Megaphone className="mx-auto h-6 w-6 text-[var(--teal-text)]" />
          <h3 className="mt-3 text-[14px] font-semibold text-[var(--text-1)]">
            No broadcasts yet
          </h3>
          <p className="mt-1 text-[12px] text-[var(--text-4)]">
            Your first queued notification will appear here.
          </p>
        </div>
      )}
    </section>
  );
}

function HistoryPagination({
  data,
  disabled,
  onPage,
}: {
  data: PageResponse<BroadcastRecord>;
  disabled: boolean;
  onPage: (page: number) => void;
}) {
  const current = data.number;
  const pages = Math.max(1, data.totalPages);
  const first = data.first ?? current === 0;
  const last = data.last ?? current + 1 >= pages;
  return (
    <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
      <span className="font-mono text-[10.5px] text-[var(--text-4)]">
        Page {current + 1} of {pages} · {data.totalElements.toLocaleString()}{" "}
        total
      </span>
      <div className="flex gap-1.5">
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          disabled={first || disabled}
          onClick={() => onPage(current - 1)}
          aria-label="Previous page"
          className="border-[var(--border)] bg-[var(--bg-2)]"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          disabled={last || disabled}
          onClick={() => onPage(current + 1)}
          aria-label="Next page"
          className="border-[var(--border)] bg-[var(--bg-2)]"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-1)]">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex gap-6 border-b border-[var(--border)] px-4 py-4 last:border-0"
        >
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-7 flex-1" />
          <Skeleton className="h-7 w-28" />
        </div>
      ))}
    </div>
  );
}

function BroadcastPageSkeleton() {
  return (
    <div className="space-y-6 p-8">
      <Skeleton className="h-16 w-80" />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Skeleton className="h-[620px] w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    </div>
  );
}
