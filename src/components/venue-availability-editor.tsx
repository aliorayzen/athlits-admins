"use client";

import { useId, useRef } from "react";
import { Copy } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { VenueAvailabilityDay, Weekday } from "@/types/api";

const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
];

const WEEKDAY_ORDER = WEEKDAYS.map((d) => d.value);

export const DEFAULT_OPEN_MINUTES = 8 * 60; // 08:00
export const DEFAULT_CLOSE_MINUTES = 22 * 60; // 22:00

// Default schedule used by the create forms: open every day, edited by
// exception. Returns fresh objects so callers can mutate state immutably.
export function defaultAvailabilityDays(): VenueAvailabilityDay[] {
  return WEEKDAY_ORDER.map((weekday) => ({
    weekday,
    openMinutes: DEFAULT_OPEN_MINUTES,
    closeMinutes: DEFAULT_CLOSE_MINUTES,
  }));
}

export function availabilityDaysWithErrors(
  days: VenueAvailabilityDay[],
): Weekday[] {
  return days
    .filter((day) => day.closeMinutes <= day.openMinutes)
    .map((day) => day.weekday);
}

const MINUTES_PER_DAY = 24 * 60;

function wrapMinutes(minutes: number): number {
  return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

// The editor and validation work in the operator's local wall-clock time, but
// the backend stores availability minutes in UTC. These two convert at the API
// boundary using the browser's current UTC offset (getTimezoneOffset() is
// minutes to ADD to local time to get UTC, e.g. -180 for UTC+3).
// Minutes wrap within the same weekday; a window whose UTC equivalent crosses
// midnight (local open earlier than the UTC offset) cannot be represented by
// the per-day open<close model and will be rejected by backend validation.
function shiftAvailabilityDays(
  days: VenueAvailabilityDay[],
  offsetMinutes: number,
): VenueAvailabilityDay[] {
  return days.map((day) => ({
    ...day,
    openMinutes: wrapMinutes(day.openMinutes + offsetMinutes),
    closeMinutes: wrapMinutes(day.closeMinutes + offsetMinutes),
  }));
}

export function availabilityDaysToUtc(
  days: VenueAvailabilityDay[],
): VenueAvailabilityDay[] {
  return shiftAvailabilityDays(days, new Date().getTimezoneOffset());
}

export function availabilityDaysFromUtc(
  days: VenueAvailabilityDay[],
): VenueAvailabilityDay[] {
  return shiftAvailabilityDays(days, -new Date().getTimezoneOffset());
}

function minutesToTime(minutes: number): string {
  // `<input type="time">` can't express 24:00, so the addressable range is
  // 00:00–23:59. Overnight (midnight-crossing) hours aren't supported here.
  const clamped = Math.min(Math.max(minutes, 0), 23 * 60 + 59);
  const hh = String(Math.floor(clamped / 60)).padStart(2, "0");
  const mm = String(clamped % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function timeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function sortDays(days: VenueAvailabilityDay[]): VenueAvailabilityDay[] {
  return [...days].sort(
    (a, b) =>
      WEEKDAY_ORDER.indexOf(a.weekday) - WEEKDAY_ORDER.indexOf(b.weekday),
  );
}

interface VenueAvailabilityEditorProps {
  days: VenueAvailabilityDay[];
  onChange: (days: VenueAvailabilityDay[]) => void;
  inputClassName?: string;
  labelClassName?: string;
  className?: string;
  // Hide the built-in section label when the surrounding card already titles
  // the section (e.g. the "Operating Hours" card on the create-venue page).
  hideLabel?: boolean;
}

// Weekly operating-hours editor. Each weekday toggles open/closed; open days
// expose open/close time fields. Open days map 1:1 to the API's
// availability.days entries; closed days are simply omitted from the payload.
export function VenueAvailabilityEditor({
  days,
  onChange,
  inputClassName,
  labelClassName,
  className,
  hideLabel = false,
}: VenueAvailabilityEditorProps) {
  const sectionId = useId();
  // Remember the last hours an operator set per day so toggling a day closed
  // and back open restores their edit instead of resetting to the default.
  // Local session memory only — not resynced if the parent replaces `days`
  // wholesale (no consumer does that today).
  const lastHours = useRef(
    new Map<Weekday, { openMinutes: number; closeMinutes: number }>(),
  );

  function dayEntry(weekday: Weekday): VenueAvailabilityDay | undefined {
    return days.find((d) => d.weekday === weekday);
  }

  function toggleDay(weekday: Weekday) {
    const existing = dayEntry(weekday);
    if (existing) {
      lastHours.current.set(weekday, {
        openMinutes: existing.openMinutes,
        closeMinutes: existing.closeMinutes,
      });
      onChange(days.filter((d) => d.weekday !== weekday));
      return;
    }
    const remembered = lastHours.current.get(weekday);
    onChange(
      sortDays([
        ...days,
        {
          weekday,
          openMinutes: remembered?.openMinutes ?? DEFAULT_OPEN_MINUTES,
          closeMinutes: remembered?.closeMinutes ?? DEFAULT_CLOSE_MINUTES,
        },
      ]),
    );
  }

  function updateDay(
    weekday: Weekday,
    field: "openMinutes" | "closeMinutes",
    time: string,
  ) {
    const minutes = timeToMinutes(time);
    if (minutes === null) return;
    onChange(
      days.map((d) => (d.weekday === weekday ? { ...d, [field]: minutes } : d)),
    );
  }

  function copyToAllOpenDays(source: VenueAvailabilityDay) {
    onChange(
      days.map((d) => ({
        ...d,
        openMinutes: source.openMinutes,
        closeMinutes: source.closeMinutes,
      })),
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label
        id={sectionId}
        className={cn(
          "text-xs font-medium uppercase tracking-wider text-[var(--text-3)]",
          labelClassName,
          hideLabel && "sr-only",
        )}
      >
        Operating hours
      </Label>
      <div
        role="group"
        aria-labelledby={sectionId}
        className="overflow-hidden rounded-lg border border-[var(--border)]"
      >
        {WEEKDAYS.map(({ value, label }, index) => {
          const entry = dayEntry(value);
          const isOpen = Boolean(entry);
          const invalid =
            entry !== undefined && entry.closeMinutes <= entry.openMinutes;

          return (
            <div
              key={value}
              className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5",
                index > 0 && "border-t border-[var(--border)]",
                isOpen ? "bg-transparent" : "bg-[var(--bg-0)]/40",
              )}
            >
              <button
                type="button"
                onClick={() => toggleDay(value)}
                aria-pressed={isOpen}
                className={cn(
                  "w-28 shrink-0 rounded-md border px-2.5 py-1.5 text-left text-[12.5px] font-medium transition-all",
                  isOpen
                    ? "border-[rgba(0,212,170,0.3)] bg-[var(--teal-subtle)] text-[var(--teal-text)]"
                    : "border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-4)] hover:border-[var(--border-strong)] hover:text-[var(--text-2)]",
                )}
              >
                {label}
              </button>

              {entry ? (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={minutesToTime(entry.openMinutes)}
                      onChange={(e) =>
                        updateDay(value, "openMinutes", e.target.value)
                      }
                      aria-label={`${label} opening time`}
                      aria-invalid={invalid || undefined}
                      className={cn(
                        "h-9 w-[8.75rem] font-mono tabular-nums",
                        inputClassName,
                        invalid &&
                          "border-[rgba(244,63,94,0.45)] focus:border-[rgba(244,63,94,0.6)]",
                      )}
                    />
                    <span className="text-[12px] text-[var(--text-4)]">to</span>
                    <Input
                      type="time"
                      value={minutesToTime(entry.closeMinutes)}
                      onChange={(e) =>
                        updateDay(value, "closeMinutes", e.target.value)
                      }
                      aria-label={`${label} closing time`}
                      aria-invalid={invalid || undefined}
                      className={cn(
                        "h-9 w-[8.75rem] font-mono tabular-nums",
                        inputClassName,
                        invalid &&
                          "border-[rgba(244,63,94,0.45)] focus:border-[rgba(244,63,94,0.6)]",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => copyToAllOpenDays(entry)}
                      title="Apply these hours to all open days"
                      aria-label={`Apply ${label} hours to all open days`}
                      className="grid h-8 w-8 place-items-center rounded-md border border-transparent text-[var(--text-4)] transition-all hover:border-[var(--border)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-2)]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {invalid && (
                    <p
                      role="alert"
                      className="basis-full text-[12px] text-[var(--semantic-red)]"
                    >
                      Closing time must be later than opening time on the same
                      day.
                    </p>
                  )}
                </>
              ) : (
                <span className="text-[12.5px] text-[var(--text-4)]">
                  Closed
                </span>
              )}
            </div>
          );
        })}
      </div>
      {days.length === 0 && (
        <p className="text-xs text-[var(--text-4)]">
          All days are closed. The venue will be created without operating
          hours.
        </p>
      )}
    </div>
  );
}
