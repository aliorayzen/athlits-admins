"use client";

import { useId, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Globe, Search } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TimezoneSelectProps {
  value: string;
  onChange: (timeZoneId: string) => void;
  id?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

interface ZoneOption {
  id: string;
  // "Asia/Riyadh" → "Asia / Riyadh" for readable matching + display.
  label: string;
  // "GMT+03:00" — computed once against the current date.
  offsetLabel: string;
  // Minutes east of UTC; drives sort order so the list reads west → east.
  offsetMinutes: number;
}

// Browser's own zone, used as the default selection. Falls back to UTC on the
// rare engine that doesn't resolve one.
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function offsetMinutesFor(timeZone: string): number {
  // Compare the same instant rendered in the target zone vs. UTC to derive the
  // current offset (handles DST since it's evaluated for "now").
  try {
    const now = new Date();
    const tzDate = new Date(now.toLocaleString("en-US", { timeZone }));
    const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    return Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
  } catch {
    return 0;
  }
}

function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `GMT${sign}${hh}:${mm}`;
}

// A short, sane fallback for engines without Intl.supportedValuesOf.
const FALLBACK_ZONES = [
  "UTC",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Asia/Beirut",
  "Asia/Qatar",
  "Asia/Kuwait",
  "Africa/Cairo",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
];

function buildZones(): ZoneOption[] {
  // `Intl.supportedValuesOf` exists in all current engines but isn't in every
  // TS lib target, so reference it through a narrowed cast.
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  };
  const supported =
    typeof intl.supportedValuesOf === "function"
      ? intl.supportedValuesOf("timeZone")
      : FALLBACK_ZONES;
  return supported
    .map((id) => {
      const offsetMinutes = offsetMinutesFor(id);
      return {
        id,
        label: id.replace(/_/g, " ").replace(/\//g, " / "),
        offsetLabel: formatOffset(offsetMinutes),
        offsetMinutes,
      };
    })
    .sort(
      (a, b) => a.offsetMinutes - b.offsetMinutes || a.id.localeCompare(b.id),
    );
}

export function TimezoneSelect({
  value,
  onChange,
  id,
  triggerClassName,
  disabled,
}: TimezoneSelectProps) {
  const reactId = useId();
  const triggerId = id ?? reactId;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const zones = useMemo(buildZones, []);
  const selected = useMemo(
    () => zones.find((z) => z.id === value),
    [zones, value],
  );

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return zones;
    return zones.filter(
      (z) =>
        z.label.toLowerCase().includes(q) ||
        z.id.toLowerCase().includes(q) ||
        z.offsetLabel.toLowerCase().includes(q),
    );
  }, [zones, q]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  function select(zoneId: string) {
    onChange(zoneId);
    handleOpenChange(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={(props) => (
          <button
            {...props}
            type="button"
            id={triggerId}
            disabled={disabled}
            role="combobox"
            aria-expanded={open}
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-md border px-3 text-left text-sm outline-none transition-all disabled:opacity-50",
              triggerClassName,
            )}
          >
            <Globe className="h-3.5 w-3.5 shrink-0 text-[var(--text-4)]" />
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                !selected && "text-[var(--text-4)]",
              )}
            >
              {selected ? selected.label : "Select a time zone"}
            </span>
            {selected && (
              <span className="shrink-0 font-mono text-[11px] text-[var(--text-3)]">
                {selected.offsetLabel}
              </span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[var(--text-4)]" />
          </button>
        )}
      />
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[var(--anchor-width)] min-w-[18rem] overflow-hidden p-0"
      >
        <div className="border-b border-[var(--border)] p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-4)]" />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city or GMT offset…"
              aria-label="Search time zones"
              className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--bg-0)] pl-8 pr-3 text-[12.5px] text-[var(--text-1)] outline-none transition-all placeholder:text-[var(--text-4)] focus:border-[rgba(0,212,170,0.3)] focus:shadow-[0_0_0_3px_var(--teal-subtle)]"
            />
          </div>
        </div>
        <div
          role="listbox"
          className="max-h-72 overflow-y-auto overscroll-contain py-1"
        >
          {matches.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12.5px] text-[var(--text-4)]">
              No matching time zone
            </p>
          ) : (
            matches.map((zone) => {
              const active = zone.id === value;
              return (
                <button
                  key={zone.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => select(zone.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] transition-colors",
                    active
                      ? "bg-[var(--teal-subtle)] text-[var(--teal-text)]"
                      : "text-[var(--text-2)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]",
                  )}
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      active ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{zone.label}</span>
                  <span className="shrink-0 font-mono text-[11px] text-[var(--text-4)]">
                    {zone.offsetLabel}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
