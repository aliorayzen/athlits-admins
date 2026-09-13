"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CalendarSearch, Loader2, RefreshCw, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  availabilityDaysWithErrors,
  decodeVenueAvailabilityDays,
  VenueAvailabilityEditor,
} from "@/components/venue-availability-editor";
import { getApiErrorMessage } from "@/lib/api";
import {
  getCourtAvailability,
  getCourtConflicts,
  getVenueAvailability,
  updateCourtAvailability,
} from "@/lib/venue-availability-api";
import type {
  AvailabilityScheduleResponse,
  BookingConflictResponse,
  CourtScheduleMode,
} from "@/types/admin-operations";
import type { VenueAvailabilityDay } from "@/types/api";

const FIELD_CLASS =
  "border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-1)] focus:border-[var(--teal)] focus:ring-[3px] focus:ring-[var(--teal-subtle)]";

export function CourtAvailabilityPanel({
  venueId,
  courtId,
  timeZoneId,
  aggregateDirty = false,
  onSaved,
}: {
  venueId: string;
  courtId: string;
  timeZoneId?: string;
  aggregateDirty?: boolean;
  onSaved?: () => Promise<void> | void;
}) {
  const [venueSchedule, setVenueSchedule] =
    useState<AvailabilityScheduleResponse | null>(null);
  const [courtSchedule, setCourtSchedule] =
    useState<AvailabilityScheduleResponse | null>(null);
  const [mode, setMode] = useState<CourtScheduleMode>("VENUE_HOURS");
  const [days, setDays] = useState<VenueAvailabilityDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError("");
    Promise.all([
      getVenueAvailability(venueId, controller.signal),
      getCourtAvailability(venueId, courtId, controller.signal),
    ]).then(
      ([venueResult, courtResult]) => {
        if (controller.signal.aborted) return;
        setVenueSchedule(venueResult);
        setCourtSchedule(courtResult);
        setMode(courtResult.scheduleMode);
        setDays(decodeVenueAvailabilityDays(courtResult.days));
        setIsLoading(false);
      },
      (caught: unknown) => {
        if (controller.signal.aborted) return;
        setError(getApiErrorMessage(caught, "Court availability could not be loaded."));
        setIsLoading(false);
      },
    );
    return () => controller.abort();
  }, [courtId, revision, venueId]);

  async function save() {
    if (isSaving || !venueSchedule) return;
    if (mode === "CUSTOM_HOURS" && (days.length === 0 || availabilityDaysWithErrors(days).length > 0)) {
      setError("Custom hours need at least one valid open day.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const updated = await updateCourtAvailability(venueId, courtId, {
        scheduleMode: mode,
        days:
          mode === "CUSTOM_HOURS"
            ? days
            : decodeVenueAvailabilityDays(venueSchedule.days),
      });
      setCourtSchedule(updated);
      setMode(updated.scheduleMode);
      setDays(decodeVenueAvailabilityDays(updated.days));
      toast.success("Court availability updated");
      try {
        await onSaved?.();
      } catch {
        toast.warning("Availability was saved, but the court record could not be refreshed.");
      }
    } catch (caught: unknown) {
      setError(getApiErrorMessage(caught, "Court availability could not be updated."));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />;

  if (!venueSchedule || !courtSchedule) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] p-5">
        <p role="alert" className="text-sm text-[var(--semantic-red)]">{error}</p>
        <Button variant="outline" className="mt-3" onClick={() => setRevision((value) => value + 1)}>
          <RefreshCw className="h-4 w-4" />Try again
        </Button>
      </section>
    );
  }

  const savedDays = decodeVenueAvailabilityDays(courtSchedule.days);
  const isDirty = mode !== courtSchedule.scheduleMode ||
    JSON.stringify(days) !== JSON.stringify(savedDays);

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--text-1)]">Availability</h2>
          <p className="text-xs text-[var(--text-4)]">
            {timeZoneId ?? "Timezone not reported"} · venue defaults stay distinct from overrides
          </p>
        </div>
        <Button disabled={!isDirty || isSaving || aggregateDirty} onClick={() => void save()}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSaving ? "Saving..." : "Save availability"}
        </Button>
      </header>
      <div className="space-y-5 p-5">
        {aggregateDirty && (
          <p role="status" className="rounded-lg border border-[rgba(245,158,11,0.25)] bg-[var(--semantic-amber-subtle)] px-4 py-3 text-xs leading-5 text-[var(--text-2)]">
            Save or discard the unsaved court-detail changes before saving availability. This keeps the full-record editor from overwriting the schedule.
          </p>
        )}
        <div role="radiogroup" aria-label="Court schedule source" className="grid gap-2 sm:grid-cols-2">
          {([
            ["VENUE_HOURS", "Use venue hours", "Inherits changes made to the venue schedule."],
            ["CUSTOM_HOURS", "Custom hours", "Overrides the venue defaults for this court."],
          ] as const).map(([value, title, description]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => {
                setMode(value);
                setError("");
                setDays(decodeVenueAvailabilityDays(
                  value === "VENUE_HOURS" ? venueSchedule.days : courtSchedule.days,
                ));
              }}
              className={`rounded-lg border p-3 text-left ${mode === value ? "border-[rgba(0,212,170,0.35)] bg-[var(--teal-subtle)]" : "border-[var(--border)] bg-[var(--bg-0)] hover:border-[var(--border-strong)]"}`}
            >
              <span className="block text-sm font-medium text-[var(--text-1)]">{title}</span>
              <span className="mt-1 block text-xs text-[var(--text-3)]">{description}</span>
            </button>
          ))}
        </div>
        {mode === "CUSTOM_HOURS" ? (
          <VenueAvailabilityEditor days={days} onChange={(nextDays) => { setDays(nextDays); setError(""); }} hideLabel inputClassName={FIELD_CLASS} />
        ) : (
          <p className="rounded-lg bg-[var(--bg-0)] px-4 py-3 text-xs leading-5 text-[var(--text-3)]">
            This court currently follows the venue’s {decodeVenueAvailabilityDays(venueSchedule.days).length} open days.
          </p>
        )}
        {error && <p role="alert" className="text-sm text-[var(--semantic-red)]">{error}</p>}
        <CourtConflicts venueId={venueId} courtId={courtId} />
      </div>
    </section>
  );
}

function CourtConflicts({ venueId, courtId }: { venueId: string; courtId: string }) {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [result, setResult] = useState<BookingConflictResponse | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState("");

  async function check() {
    if (!startTime || !endTime || endTime <= startTime) {
      setError("Choose an end time after the start time.");
      return;
    }
    setIsChecking(true);
    setError("");
    try {
      setResult(await getCourtConflicts(venueId, courtId, { startTime, endTime }));
    } catch (caught: unknown) {
      setError(getApiErrorMessage(caught, "Conflicts could not be checked."));
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <div className="border-t border-[var(--border)] pt-5">
      <div className="flex items-center gap-2"><CalendarSearch className="h-4 w-4 text-[var(--text-3)]" /><h3 className="text-sm font-semibold text-[var(--text-1)]">Booking conflicts</h3></div>
      <p className="mt-1 text-xs text-[var(--text-4)]">Check a local date-time window before changing hours or destructive configuration.</p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Field label="Starts"><Input type="datetime-local" value={startTime} onChange={(event) => { setStartTime(event.target.value); setResult(null); }} className={FIELD_CLASS} /></Field>
        <Field label="Ends"><Input type="datetime-local" value={endTime} onChange={(event) => { setEndTime(event.target.value); setResult(null); }} className={FIELD_CLASS} /></Field>
        <Button variant="outline" disabled={isChecking} onClick={() => void check()}>{isChecking && <Loader2 className="h-4 w-4 animate-spin" />}{isChecking ? "Checking..." : "Check conflicts"}</Button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-[var(--semantic-red)]">{error}</p>}
      {result && (
        <div className={`mt-3 rounded-lg border px-4 py-3 ${result.conflict ? "border-[rgba(245,158,11,0.25)] bg-[var(--semantic-amber-subtle)]" : "border-[var(--border)] bg-[var(--bg-0)]"}`}>
          <p className="flex items-center gap-2 text-sm font-medium text-[var(--text-1)]">
            {result.conflict && <AlertTriangle className="h-4 w-4 text-[var(--semantic-amber)]" />}
            {result.conflict ? `${result.conflictingBookingIds.length} conflicting bookings` : "No booking conflicts"}
          </p>
          {result.conflict && <p className="mt-1 font-mono text-xs text-[var(--text-3)]">IDs: {result.conflictingBookingIds.join(", ")} · <Link href="/dashboard/bookings" className="text-[var(--teal-text)] hover:underline">Open bookings</Link></p>}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1.5"><Label>{label}</Label>{children}</label>;
}
