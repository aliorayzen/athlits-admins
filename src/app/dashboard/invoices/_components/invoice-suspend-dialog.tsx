"use client";

import { useId, useState } from "react";
import { CheckCircle2, Loader2, RotateCcw, ShieldOff } from "lucide-react";

import {
  getApiErrorMessage,
  reactivateVenueManagerFromInvoice,
  suspendVenueManagerFromInvoice,
} from "@/lib/api";
import type {
  InvoiceResponse,
  VenueManagerSuspensionResult,
} from "@/types/api";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Action = "suspend" | "reactivate";

// A darker, slightly blurred scrim for this dialog only: it opens over red
// "overdue" rows, and the default light backdrop lets that red bleed around it.
const OVERLAY =
  "bg-[rgba(8,9,12,0.66)] supports-backdrop-filter:backdrop-blur-sm";

interface SuspendVmDialogProps {
  invoice: InvoiceResponse;
  /** Refetch the list after a suspend/reactivate so statuses stay in sync. */
  onChanged: () => void;
}

/**
 * Suspend (or reactivate) the venue manager tied to an OVERDUE invoice. Suspend
 * is the primary, destructive action; reactivate is an idempotent escape hatch
 * (the backend treats reactivate as idempotent, and the invoice carries no
 * VM-status flag we could key a standing toggle off of).
 *
 * Restrained by design: neutral surfaces, with red reserved for the danger icon
 * and the primary action only.
 */
export function SuspendVmDialog({ invoice, onChanged }: SuspendVmDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<Action | null>(null);
  const [result, setResult] = useState<VenueManagerSuspensionResult | null>(
    null,
  );
  const reasonId = useId();

  const shortId = invoice.id.slice(0, 8).toUpperCase();
  const venueName = invoice.venueName ?? invoice.venueId;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setReason("");
      setResult(null);
      setBusy(null);
    }
  }

  async function run(action: Action) {
    setBusy(action);
    try {
      const res =
        action === "suspend"
          ? await suspendVenueManagerFromInvoice(
              invoice.id,
              reason.trim() || undefined,
            )
          : await reactivateVenueManagerFromInvoice(invoice.id);
      setResult(res);
      toast.success(
        action === "suspend"
          ? "Venue manager suspended"
          : "Venue manager reactivated",
      );
      onChanged();
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(
          err,
          action === "suspend"
            ? "Could not suspend venue manager"
            : "Could not reactivate venue manager",
        ),
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={(props) => (
          <button
            {...props}
            type="button"
            title="Suspend venue manager"
            aria-label={`Suspend venue manager for invoice ${invoice.id.slice(0, 8)}`}
            className="grid h-11 w-11 place-items-center rounded border border-[rgba(244,63,94,0.2)] bg-[rgba(244,63,94,0.06)] text-[var(--semantic-red)] opacity-70 transition-all group-hover:opacity-100 hover:border-[rgba(244,63,94,0.4)] hover:bg-[rgba(244,63,94,0.12)]"
          >
            <ShieldOff className="h-[13px] w-[13px]" />
          </button>
        )}
      />
      <DialogContent
        overlayClassName={OVERLAY}
        className="border-[var(--border)] bg-[var(--bg-1)] sm:max-w-md"
      >
        {result ? (
          <ResultView
            result={result}
            venueName={venueName}
            busy={busy}
            onToggle={run}
            onClose={() => handleOpenChange(false)}
          />
        ) : (
          <>
            <DialogHeader className="pr-7">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[rgba(244,63,94,0.22)] bg-[rgba(244,63,94,0.08)] text-[var(--semantic-red)]">
                  <ShieldOff className="h-[17px] w-[17px]" />
                </span>
                <div className="min-w-0">
                  <DialogTitle className="text-[15px] leading-tight">
                    Suspend venue manager
                  </DialogTitle>
                  <DialogDescription className="truncate text-[12.5px] text-[var(--text-3)]">
                    {venueName} · Invoice{" "}
                    <span className="font-mono">#{shortId}</span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5 text-[13px] leading-[1.5]">
                <p className="text-[var(--text-2)]">
                  Blocks the venue manager from signing in and disables their
                  venues and courts for new bookings.
                </p>
                <p className="text-[12.5px] text-[var(--text-4)]">
                  Existing invoices, bookings, and data stay intact. Reversible
                  at any time.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor={reasonId}
                  className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]"
                >
                  Reason{" "}
                  <span className="font-normal lowercase tracking-normal">
                    · optional, audit-logged
                  </span>
                </Label>
                <Textarea
                  id={reasonId}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="e.g. 60+ days overdue, no response to reminders"
                  className="resize-none border-[var(--border)] bg-[var(--bg-2)] text-[13px] text-[var(--text-1)] placeholder:text-[var(--text-4)] focus-visible:border-[var(--teal)] focus-visible:ring-[3px] focus-visible:ring-[var(--teal-subtle)]"
                />
              </div>

              {/* Tertiary action kept out of the footer so it can't crowd the
                  two primary buttons (a too-wide button row expands the grid
                  track and overflows the dialog). */}
              <button
                type="button"
                onClick={() => run("reactivate")}
                disabled={busy !== null}
                title="Already resolved? Restore a previously suspended manager"
                className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-3)] underline-offset-2 transition-colors hover:text-[var(--semantic-green)] hover:underline disabled:opacity-50"
              >
                {busy === "reactivate" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                Already resolved? Reactivate instead
              </button>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="h-9 border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-2)] hover:border-[var(--border-strong)] hover:text-[var(--text-1)]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => run("suspend")}
                disabled={busy !== null}
                className="h-9 gap-2 bg-[var(--semantic-red)] font-medium text-white transition-[filter] hover:brightness-110 active:brightness-95"
              >
                {busy === "suspend" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldOff className="h-4 w-4" />
                )}
                Suspend manager
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResultView({
  result,
  venueName,
  busy,
  onToggle,
  onClose,
}: {
  result: VenueManagerSuspensionResult;
  venueName: string;
  busy: Action | null;
  onToggle: (action: Action) => void;
  onClose: () => void;
}) {
  const suspended = result.status === "SUSPENDED";
  const manager = result.venueManager;
  const managerName =
    `${manager.firstName ?? ""} ${manager.lastName ?? ""}`.trim() ||
    manager.email;
  const venueCount = result.affectedVenueIds.length;
  const courtCount = result.affectedCourtIds.length;
  const opposite: Action = suspended ? "reactivate" : "suspend";

  return (
    <>
      <DialogHeader className="pr-7">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-lg border",
              suspended
                ? "border-[rgba(244,63,94,0.22)] bg-[rgba(244,63,94,0.08)] text-[var(--semantic-red)]"
                : "border-[rgba(16,185,129,0.22)] bg-[rgba(16,185,129,0.08)] text-[var(--semantic-green)]",
            )}
          >
            {suspended ? (
              <ShieldOff className="h-[17px] w-[17px]" />
            ) : (
              <CheckCircle2 className="h-[17px] w-[17px]" />
            )}
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-[15px] leading-tight">
              {suspended
                ? "Venue manager suspended"
                : "Venue manager reactivated"}
            </DialogTitle>
            <DialogDescription className="truncate text-[12.5px] text-[var(--text-3)]">
              {managerName} · {venueName}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <p className="text-[13px] leading-[1.5] text-[var(--text-2)]">
        {suspended ? "Suspended" : "Restored"}{" "}
        <span className="font-medium text-[var(--text-1)]">{venueCount}</span>{" "}
        {venueCount === 1 ? "venue" : "venues"} and{" "}
        <span className="font-medium text-[var(--text-1)]">{courtCount}</span>{" "}
        {courtCount === 1 ? "court" : "courts"}.
      </p>

      <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => onToggle(opposite)}
          disabled={busy !== null}
          className="h-9 gap-2 border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-2)] hover:border-[var(--border-strong)] hover:text-[var(--text-1)]"
        >
          {busy === opposite ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          {suspended ? "Reactivate" : "Suspend again"}
        </Button>
        <Button
          type="button"
          onClick={onClose}
          className="h-9 bg-[var(--bg-3)] font-medium text-[var(--text-1)] hover:bg-[var(--border-strong)]"
        >
          Done
        </Button>
      </DialogFooter>
    </>
  );
}
