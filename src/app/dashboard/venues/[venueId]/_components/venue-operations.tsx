"use client";

import { useEffect, useState } from "react";
import { CalendarOff, Clock3, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  availabilityTimeLabel,
  decodeVenueAvailabilityDays,
  VENUE_WEEKDAYS,
} from "@/components/venue-availability-editor";
import { getApiErrorMessage } from "@/lib/api";
import {
  checkVenueBlackout,
  confirmVenueBlackout,
  deleteVenueBlackout,
  getVenueAvailability,
  getVenueBlackouts,
} from "@/lib/venue-availability-api";
import { updateVenueCourtLimit } from "@/lib/venues-api";
import type {
  AvailabilityScheduleResponse,
  BlackoutImpactResponse,
  BlackoutResponse,
  CreateBlackoutRequest,
} from "@/types/admin-operations";
import type { VenueDetailResponse } from "@/types/api";

type LoadState = "loading" | "ready" | "error";

interface BlackoutDraft {
  date: string;
  courtId: string;
  startTime: string;
  endTime: string;
  reason: string;
}

const EMPTY_BLACKOUT: BlackoutDraft = {
  date: "",
  courtId: "",
  startTime: "",
  endTime: "",
  reason: "",
};

const FIELD_CLASS =
  "border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-1)] focus:border-[var(--teal)] focus:ring-[3px] focus:ring-[var(--teal-subtle)]";

export function VenueOperations({
  venue,
  onCourtLimitChanged,
}: {
  venue: VenueDetailResponse;
  onCourtLimitChanged: (courtLimit: number) => void;
}) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [availability, setAvailability] =
    useState<AvailabilityScheduleResponse | null>(null);
  const [blackouts, setBlackouts] = useState<BlackoutResponse[]>([]);
  const [revision, setRevision] = useState(0);

  function reload() {
    setLoadState("loading");
    setLoadError("");
    setRevision((value) => value + 1);
  }

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getVenueAvailability(venue.id, controller.signal),
      getVenueBlackouts(venue.id, controller.signal),
    ]).then(
      ([schedule, blackoutRows]) => {
        if (controller.signal.aborted) return;
        setAvailability(schedule);
        setBlackouts(blackoutRows);
        setLoadState("ready");
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(
          getApiErrorMessage(error, "Venue scheduling data could not be loaded."),
        );
        setLoadState("error");
      },
    );
    return () => controller.abort();
  }, [revision, venue.id]);

  if (loadState === "loading") {
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div role="alert" className="rounded-xl border border-[var(--border)] bg-[var(--bg-1)] p-5">
        <p className="text-sm text-[var(--semantic-red)]">{loadError}</p>
        <Button variant="outline" className="mt-3" onClick={reload}>
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <VenueAvailabilitySection
        availability={availability}
        timeZoneId={venue.timeZoneId}
      />
      <CourtLimitSection
        venue={venue}
        onCourtLimitChanged={onCourtLimitChanged}
      />
      <BlackoutsSection
        venue={venue}
        blackouts={blackouts}
        onChanged={reload}
      />
    </div>
  );
}

function VenueAvailabilitySection({
  availability,
  timeZoneId,
}: {
  availability: AvailabilityScheduleResponse | null;
  timeZoneId?: string;
}) {
  const days = decodeVenueAvailabilityDays(availability?.days ?? []);

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]">
      <header className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
        <Clock3 className="h-4 w-4 text-[var(--teal-text)]" />
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--text-1)]">Venue availability</h2>
          <p className="text-xs text-[var(--text-4)]">
            Default weekly hours · {timeZoneId ?? "Timezone not reported"}
          </p>
        </div>
      </header>
      <div className="divide-y divide-[var(--border)] px-5">
        {VENUE_WEEKDAYS.map(({ value, label }) => {
          const day = days.find((candidate) => candidate.weekday === value);
          return (
            <div key={value} className="flex items-center justify-between gap-4 py-2.5 text-xs">
              <span className="font-medium text-[var(--text-2)]">{label}</span>
              <span className={day ? "font-mono text-[var(--text-2)]" : "text-[var(--text-4)]"}>
                {day
                  ? `${availabilityTimeLabel(day.openMinutes)} – ${availabilityTimeLabel(day.closeMinutes)}`
                  : "Closed"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CourtLimitSection({
  venue,
  onCourtLimitChanged,
}: {
  venue: VenueDetailResponse;
  onCourtLimitChanged: (courtLimit: number) => void;
}) {
  const currentCourtCount = venue.courtCount ?? venue.courts.length;
  const [draft, setDraft] = useState(String(venue.courtLimit ?? Math.max(1, currentCourtCount)));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const courtLimit = Number(draft);
    if (!Number.isInteger(courtLimit) || courtLimit < Math.max(1, currentCourtCount)) {
      setError(`Court limit must be at least ${Math.max(1, currentCourtCount)}.`);
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const updated = await updateVenueCourtLimit(venue.id, { courtLimit });
      onCourtLimitChanged(updated.courtLimit ?? courtLimit);
      toast.success("Court limit updated");
    } catch (caught: unknown) {
      setError(getApiErrorMessage(caught, "Court limit could not be updated."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">Venue configuration</p>
      <h2 className="mt-2 text-[15px] font-semibold text-[var(--text-1)]">Court limit</h2>
      <p className="mt-1 max-w-[60ch] text-xs leading-5 text-[var(--text-3)]">
        Controls how many courts can be registered for this venue. It cannot be lower than the {currentCourtCount} existing courts.
      </p>
      <div className="mt-5 flex items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="venue-court-limit">Maximum courts</Label>
          <Input
            id="venue-court-limit"
            type="number"
            min={Math.max(1, currentCourtCount)}
            value={draft}
            disabled={isSaving}
            onChange={(event) => {
              setDraft(event.target.value);
              setError("");
            }}
            className={`w-32 ${FIELD_CLASS}`}
          />
        </div>
        <Button disabled={isSaving || Number(draft) === venue.courtLimit} onClick={() => void save()}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSaving ? "Saving..." : "Update limit"}
        </Button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-[var(--semantic-red)]">{error}</p>}
    </section>
  );
}

function BlackoutsSection({
  venue,
  blackouts,
  onChanged,
}: {
  venue: VenueDetailResponse;
  blackouts: BlackoutResponse[];
  onChanged: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] lg:col-span-2">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
        <div className="flex items-center gap-3">
          <CalendarOff className="h-4 w-4 text-[var(--semantic-amber)]" />
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--text-1)]">Blackout dates</h2>
            <p className="text-xs text-[var(--text-4)]">Review booking impact before closing availability.</p>
          </div>
        </div>
        <CreateBlackoutDialog venue={venue} onCreated={onChanged} />
      </header>
      {blackouts.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-[var(--text-4)]">No blackout dates are scheduled.</p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {blackouts.map((blackout) => (
            <BlackoutRow key={blackout.id} venue={venue} blackout={blackout} onDeleted={onChanged} />
          ))}
        </div>
      )}
    </section>
  );
}

function CreateBlackoutDialog({ venue, onCreated }: { venue: VenueDetailResponse; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<BlackoutDraft>(EMPTY_BLACKOUT);
  const [checkedRequest, setCheckedRequest] = useState<CreateBlackoutRequest | null>(null);
  const [impact, setImpact] = useState<BlackoutImpactResponse | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  function updateDraft(patch: Partial<BlackoutDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setCheckedRequest(null);
    setImpact(null);
    setError("");
  }

  function payload(): CreateBlackoutRequest | null {
    if (!draft.date) {
      setError("Select a blackout date.");
      return null;
    }
    if (Boolean(draft.startTime) !== Boolean(draft.endTime)) {
      setError("Provide both a start and end time, or leave both blank for all day.");
      return null;
    }
    if (draft.startTime && draft.endTime <= draft.startTime) {
      setError("End time must be after start time.");
      return null;
    }
    return {
      date: draft.date,
      ...(draft.courtId ? { courtId: Number(draft.courtId) } : {}),
      ...(draft.startTime ? { startTime: `${draft.startTime}:00`, endTime: `${draft.endTime}:00` } : {}),
      ...(draft.reason.trim() ? { reason: draft.reason.trim() } : {}),
    };
  }

  async function checkImpact() {
    const request = payload();
    if (!request || isPending) return;
    setIsPending(true);
    try {
      const result = await checkVenueBlackout(venue.id, request);
      setCheckedRequest(request);
      setImpact(result);
    } catch (caught: unknown) {
      setError(getApiErrorMessage(caught, "Blackout impact could not be checked."));
    } finally {
      setIsPending(false);
    }
  }

  async function confirm() {
    if (!checkedRequest || !impact || isPending) return;
    setIsPending(true);
    try {
      const result = await confirmVenueBlackout(venue.id, checkedRequest);
      setOpen(false);
      onCreated();
      toast.success(`Blackout confirmed; ${result.cancelledBookingCount} bookings cancelled`);
    } catch (caught: unknown) {
      setError(getApiErrorMessage(caught, "Blackout could not be confirmed."));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (isPending) return;
      setOpen(nextOpen);
      if (nextOpen) {
        setDraft(EMPTY_BLACKOUT);
        setCheckedRequest(null);
        setImpact(null);
        setError("");
      }
    }}>
      <DialogTrigger render={<Button size="sm" />}>Add blackout</DialogTrigger>
      <DialogContent className="border-[var(--border)] bg-[var(--bg-1)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule blackout</DialogTitle>
          <DialogDescription>Check the impact first. Confirmation is enabled only for the exact request that was reviewed.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <Field label="Date"><Input type="date" value={draft.date} onChange={(event) => updateDraft({ date: event.target.value })} className={FIELD_CLASS} /></Field>
          <Field label="Scope">
            <select value={draft.courtId} onChange={(event) => updateDraft({ courtId: event.target.value })} className={`h-9 w-full rounded-md border px-3 text-sm ${FIELD_CLASS}`}>
              <option value="">Entire venue</option>
              {venue.courts.map((court) => <option key={court.id} value={court.id}>{court.name}</option>)}
            </select>
          </Field>
          <Field label="Start time (optional)"><Input type="time" value={draft.startTime} onChange={(event) => updateDraft({ startTime: event.target.value })} className={FIELD_CLASS} /></Field>
          <Field label="End time (optional)"><Input type="time" value={draft.endTime} onChange={(event) => updateDraft({ endTime: event.target.value })} className={FIELD_CLASS} /></Field>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="blackout-reason">Reason</Label>
            <Input id="blackout-reason" value={draft.reason} maxLength={240} onChange={(event) => updateDraft({ reason: event.target.value })} placeholder="Maintenance, event, resurfacing..." className={FIELD_CLASS} />
          </div>
        </div>
        {impact && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-0)] px-4 py-3">
            <p className="text-sm font-medium text-[var(--text-1)]">Impact reviewed</p>
            <p className="mt-1 text-xs text-[var(--text-3)]">
              {impact.overlappingBookingCount === 0
                ? "No bookings overlap this blackout."
                : `${impact.overlappingBookingCount} overlapping bookings will be cancelled and notified.`}
            </p>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-[var(--semantic-red)]">{error}</p>}
        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={() => setOpen(false)}>Cancel</Button>
          {!checkedRequest ? (
            <Button disabled={isPending} onClick={() => void checkImpact()}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? "Checking..." : "Check impact"}
            </Button>
          ) : (
            <Button disabled={isPending} onClick={() => void confirm()} className="bg-[var(--semantic-amber)] text-[var(--bg-0)] hover:brightness-110">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? "Confirming..." : "Confirm blackout"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BlackoutRow({ venue, blackout, onDeleted }: { venue: VenueDetailResponse; blackout: BlackoutResponse; onDeleted: () => void }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const courtName = blackout.courtId
    ? venue.courts.find((court) => String(court.id) === String(blackout.courtId))?.name ?? `Court ${blackout.courtId}`
    : blackout.courtAreaId
      ? `Court area ${blackout.courtAreaId}`
      : "Entire venue";

  async function remove() {
    setIsDeleting(true);
    try {
      await deleteVenueBlackout(venue.id, blackout.id);
      onDeleted();
      toast.success("Blackout removed");
    } catch (caught: unknown) {
      setError(getApiErrorMessage(caught, "Blackout could not be removed."));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3">
      <div>
        <p className="font-mono text-sm text-[var(--text-1)]">{blackout.date} · {blackout.startTime ? `${blackout.startTime}–${blackout.endTime}` : "All day"}</p>
        <p className="mt-1 text-xs text-[var(--text-3)]">{courtName}{blackout.reason ? ` · ${blackout.reason}` : ""}</p>
        {error && <p role="alert" className="mt-1 text-xs text-[var(--semantic-red)]">{error}</p>}
      </div>
      <AlertDialog>
        <AlertDialogTrigger render={<Button size="icon" variant="ghost" aria-label={`Delete blackout on ${blackout.date}`} />}><Trash2 className="h-4 w-4 text-[var(--semantic-red)]" /></AlertDialogTrigger>
        <AlertDialogContent className="border-[var(--border)] bg-[var(--bg-1)]">
          <AlertDialogHeader><AlertDialogTitle>Delete this blackout?</AlertDialogTitle><AlertDialogDescription>Availability will reopen for {blackout.date}. Cancelled bookings are not restored automatically.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel><AlertDialogAction disabled={isDeleting} onClick={(event) => { event.preventDefault(); void remove(); }} className="bg-[var(--semantic-red)] text-[var(--bg-0)] hover:brightness-110">{isDeleting ? "Deleting..." : "Delete blackout"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1.5"><Label>{label}</Label>{children}</label>;
}
