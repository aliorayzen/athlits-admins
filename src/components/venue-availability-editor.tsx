"use client";

import { useId, useRef } from "react";
import { Copy } from "lucide-react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { VenueAvailabilityDay, Weekday } from "@/types/api";

export const VENUE_WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
];

const WEEKDAY_ORDER = VENUE_WEEKDAYS.map((d) => d.value);
const WEEKDAY_ALIASES: Record<string, Weekday> = {
  MON: "MONDAY",
  MONDAY: "MONDAY",
  TUE: "TUESDAY",
  TUESDAY: "TUESDAY",
  WED: "WEDNESDAY",
  WEDNESDAY: "WEDNESDAY",
  THU: "THURSDAY",
  THURSDAY: "THURSDAY",
  FRI: "FRIDAY",
  FRIDAY: "FRIDAY",
  SAT: "SATURDAY",
  SATURDAY: "SATURDAY",
  SUN: "SUNDAY",
  SUNDAY: "SUNDAY",
};

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

// Availability data has existed across multiple backend versions. Normalize it
// before it reaches the editor so legacy aliases, numeric strings, duplicate
// weekdays, or malformed hidden rows cannot block the entire venue form.
export function decodeVenueAvailabilityDays(
  value: unknown,
): VenueAvailabilityDay[] {
  if (!Array.isArray(value)) return [];

  const days: VenueAvailabilityDay[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const raw = candidate as Record<string, unknown>;
    const weekdayValue = raw.weekday ?? raw.dayOfWeek;
    if (typeof weekdayValue !== "string") continue;

    const weekday = WEEKDAY_ALIASES[weekdayValue.trim().toUpperCase()];
    if (!weekday) continue;

    const openMinutes = Number(raw.openMinutes);
    const closeMinutes = Number(raw.closeMinutes);
    if (
      !Number.isInteger(openMinutes) ||
      !Number.isInteger(closeMinutes) ||
      openMinutes < 0 ||
      openMinutes >= 24 * 60 ||
      closeMinutes <= openMinutes ||
      closeMinutes > openMinutes + 24 * 60
    ) {
      continue;
    }

    days.push({ weekday, openMinutes, closeMinutes });
  }

  return [...days].sort(
    (a, b) =>
      WEEKDAY_ORDER.indexOf(a.weekday) - WEEKDAY_ORDER.indexOf(b.weekday) ||
      a.openMinutes - b.openMinutes,
  );
}

export function normalizeAvailabilityDays(
  value: unknown,
): VenueAvailabilityDay[] {
  const byWeekday = new Map<Weekday, VenueAvailabilityDay>();
  for (const day of decodeVenueAvailabilityDays(value)) {
    byWeekday.set(day.weekday, day);
  }

  return sortDays([...byWeekday.values()]);
}

export function availabilityDaysWithErrors(
  days: VenueAvailabilityDay[],
): Weekday[] {
  return days
    .filter(
      (day) =>
        !Number.isInteger(day.openMinutes) ||
        !Number.isInteger(day.closeMinutes) ||
        day.openMinutes < 0 ||
        day.openMinutes >= MINUTES_PER_DAY ||
        day.closeMinutes <= day.openMinutes ||
        day.closeMinutes > day.openMinutes + MINUTES_PER_DAY,
    )
    .map((day) => day.weekday);
}

const MINUTES_PER_DAY = 24 * 60;

function wrapMinutes(minutes: number): number {
  return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

// Kept under the existing names for call-site compatibility. The backend owns
// timezone conversion and expects venue-local wall-clock minutes unchanged.
export function availabilityDaysToUtc(
  days: VenueAvailabilityDay[],
): VenueAvailabilityDay[] {
  return normalizeAvailabilityDays(days);
}

export function availabilityDaysFromUtc(
  days: VenueAvailabilityDay[],
): VenueAvailabilityDay[] {
  return normalizeAvailabilityDays(days);
}

// Never invent operating hours for an existing venue. Missing or malformed
// data stays empty so the UI cannot disguise it as the creation default.
export function availabilityDaysForEdit(
  days: VenueAvailabilityDay[] | null | undefined,
): VenueAvailabilityDay[] {
  return availabilityDaysFromUtc(days ?? []);
}

// Selectable times are offered on a 30-minute grid. Operators pick from a
// dropdown instead of typing a raw time (overnight/midnight-crossing windows
// aren't representable by the per-day open<close model and stay out of scope).
const TIME_STEP_MINUTES = 30;

// 12-hour AM/PM label for a minutes-since-midnight value, e.g. 480 -> "8:00 AM".
export function availabilityTimeLabel(minutes: number): string {
  const m = wrapMinutes(minutes);
  const hour24 = Math.floor(m / 60);
  const mm = m % 60;
  const period = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const dayOffset = Math.floor(minutes / MINUTES_PER_DAY);
  const suffix = dayOffset > 0 ? " next day" : "";
  return `${hour12}:${String(mm).padStart(2, "0")} ${period}${suffix}`;
}

// The 30-minute grid (00:00–23:30). Any off-grid stored value (e.g. an existing
// 08:15 returned by the backend) is injected so the select represents it
// faithfully rather than silently snapping it to the nearest slot.
function buildTimeOptions(
  current: number,
  minMinutes = 0,
  maxMinutes = MINUTES_PER_DAY - 1,
): number[] {
  const options: number[] = [];
  const firstGridMinute = Math.ceil(minMinutes / TIME_STEP_MINUTES) * TIME_STEP_MINUTES;
  for (let m = firstGridMinute; m <= maxMinutes; m += TIME_STEP_MINUTES) {
    options.push(m);
  }
  if (current >= 0 && current <= 2 * MINUTES_PER_DAY && !options.includes(current)) {
    options.push(current);
    options.sort((a, b) => a - b);
  }
  return options;
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
    minutes: number,
  ) {
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
        {VENUE_WEEKDAYS.map(({ value, label }, index) => {
          const entry = dayEntry(value);
          const isOpen = Boolean(entry);
          const invalid =
            entry !== undefined &&
            (entry.closeMinutes <= entry.openMinutes ||
              entry.closeMinutes > entry.openMinutes + MINUTES_PER_DAY);

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
                    <TimeSelect
                      value={entry.openMinutes}
                      onChange={(minutes) =>
                        updateDay(value, "openMinutes", minutes)
                      }
                      ariaLabel={`${label} opening time`}
                      invalid={invalid}
                      className={inputClassName}
                    />
                    <span className="text-[12px] text-[var(--text-4)]">to</span>
                    <TimeSelect
                      value={entry.closeMinutes}
                      onChange={(minutes) =>
                        updateDay(value, "closeMinutes", minutes)
                      }
                      ariaLabel={`${label} closing time`}
                      invalid={invalid}
                      minMinutes={entry.openMinutes + 1}
                      maxMinutes={entry.openMinutes + MINUTES_PER_DAY}
                      className={inputClassName}
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
          No operating hours are set. Select a weekday to open it.
        </p>
      )}
    </div>
  );
}

// Themed time-of-day picker. A native <select> (not a typed time input) so
// operators choose from the 30-minute grid; it inherits the form's field
// styling and follows the theme via `color-scheme` like the other selects.
interface TimeSelectProps {
  value: number;
  onChange: (minutes: number) => void;
  ariaLabel: string;
  invalid: boolean;
  minMinutes?: number;
  maxMinutes?: number;
  className?: string;
}

function TimeSelect({
  value,
  onChange,
  ariaLabel,
  invalid,
  minMinutes,
  maxMinutes,
  className,
}: TimeSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-9 w-[8.25rem] rounded-md border px-2.5 text-[13px] font-mono tabular-nums outline-none transition-all",
        className,
        invalid &&
          "border-[rgba(244,63,94,0.45)] focus:border-[rgba(244,63,94,0.6)]",
      )}
    >
      {buildTimeOptions(value, minMinutes, maxMinutes).map((minutes) => (
        <option key={minutes} value={minutes}>
          {availabilityTimeLabel(minutes)}
        </option>
      ))}
    </select>
  );
}
