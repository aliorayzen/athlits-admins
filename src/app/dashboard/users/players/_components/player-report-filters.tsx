"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { UserStatus } from "@/types/api";

import {
  EMPTY_PLAYER_FILTERS,
  type PlayerReportFilters,
} from "./use-players-report";

const ACCOUNT_STATUSES: { value: UserStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "DISABLED", label: "Disabled" },
  { value: "PENDING_PHONE_VERIFICATION", label: "Phone pending" },
  { value: "PENDING_EMAIL_VERIFICATION", label: "Email pending" },
  { value: "PENDING_SIGNUP_COMPLETION", label: "Signup pending" },
];

const RESERVATION_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

export function countPlayerFilters(filters: PlayerReportFilters): number {
  return [
    filters.accountStatus.length > 0,
    Boolean(filters.registeredFrom || filters.registeredTo),
    filters.reservationStatus.length > 0,
    filters.paid !== "",
  ].filter(Boolean).length;
}

export function PlayerReportFiltersPanel({
  value,
  onApply,
}: {
  value: PlayerReportFilters;
  onApply: (filters: PlayerReportFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const activeCount = countPlayerFilters(value);

  function toggleOpen() {
    if (!open) setDraft(value);
    setOpen((current) => !current);
  }

  function toggleAccount(status: UserStatus) {
    setDraft((current) => ({
      ...current,
      accountStatus: toggleValue(current.accountStatus, status),
    }));
  }

  function toggleReservation(status: string) {
    setDraft((current) => ({
      ...current,
      reservationStatus: toggleValue(current.reservationStatus, status),
    }));
  }

  function apply() {
    if (
      draft.registeredFrom &&
      draft.registeredTo &&
      draft.registeredFrom > draft.registeredTo
    ) {
      toast.error("Registration start date must be before the end date.");
      return;
    }
    onApply({ ...draft });
    setOpen(false);
  }

  function clear() {
    setDraft(EMPTY_PLAYER_FILTERS);
    onApply(EMPTY_PLAYER_FILTERS);
    setOpen(false);
  }

  return (
    <section aria-label="Player report filters">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          aria-expanded={open}
          aria-controls="player-report-filter-panel"
          onClick={toggleOpen}
          className={cn(
            "h-8 gap-1.5 border-[var(--border)] bg-[var(--bg-1)] px-3 text-[12px] text-[var(--text-2)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]",
            open &&
              "border-[rgba(0,212,170,0.22)] bg-[var(--teal-subtle)] text-[var(--teal-text)]",
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-[var(--teal)] px-1.5 py-px font-mono text-[10px] font-semibold text-[#032921]">
              {activeCount}
            </span>
          )}
        </Button>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12px] text-[var(--text-3)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--text-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {open && (
        <div
          id="player-report-filter-panel"
          className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-1)] p-4"
        >
          <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr_1.3fr_0.8fr]">
            <FilterGroup label="Account status">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                {ACCOUNT_STATUSES.map((option) => (
                  <CheckOption
                    key={option.value}
                    id={`player-account-${option.value}`}
                    checked={draft.accountStatus.includes(option.value)}
                    label={option.label}
                    onChange={() => toggleAccount(option.value)}
                  />
                ))}
              </div>
            </FilterGroup>

            <FilterGroup label="Registered">
              <DateField
                id="player-registered-from"
                label="From"
                value={draft.registeredFrom}
                max={draft.registeredTo || undefined}
                onChange={(registeredFrom) =>
                  setDraft((current) => ({ ...current, registeredFrom }))
                }
              />
              <DateField
                id="player-registered-to"
                label="To"
                value={draft.registeredTo}
                min={draft.registeredFrom || undefined}
                onChange={(registeredTo) =>
                  setDraft((current) => ({ ...current, registeredTo }))
                }
              />
            </FilterGroup>

            <FilterGroup label="Reservation status">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                {RESERVATION_STATUSES.map((status) => (
                  <CheckOption
                    key={status}
                    id={`player-reservation-${status}`}
                    checked={draft.reservationStatus.includes(status)}
                    label={status.replaceAll("_", " ").toLowerCase()}
                    capitalize
                    onChange={() => toggleReservation(status)}
                  />
                ))}
              </div>
            </FilterGroup>

            <FilterGroup label="Payment">
              <label htmlFor="player-paid-filter" className="sr-only">
                Payment filter
              </label>
              <select
                id="player-paid-filter"
                value={draft.paid}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    paid: event.target.value as PlayerReportFilters["paid"],
                  }))
                }
                className="h-[38px] w-full rounded-md border border-[var(--border)] bg-[var(--bg-0)] px-3 text-[12.5px] text-[var(--text-2)] outline-none focus:border-[var(--teal)] focus:ring-[3px] focus:ring-[var(--teal-subtle)]"
              >
                <option value="">All players</option>
                <option value="true">Paid bookings</option>
                <option value="false">Unpaid bookings</option>
              </select>
            </FilterGroup>
          </div>

          <div className="mt-4 flex justify-end gap-2 border-t border-[var(--border)] pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="h-8 px-3 text-[12px] text-[var(--text-3)]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={apply}
              className="h-8 bg-[var(--teal)] px-4 text-[12px] font-semibold text-[#032921] hover:bg-[var(--teal)] hover:brightness-110"
            >
              Apply filters
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((candidate) => candidate !== value)
    : [...values, value];
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
        {label}
      </legend>
      {children}
    </fieldset>
  );
}

function CheckOption({
  id,
  checked,
  label,
  capitalize = false,
  onChange,
}: {
  id: string;
  checked: boolean;
  label: string;
  capitalize?: boolean;
  onChange: () => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--text-2)]"
    >
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <span className={cn(capitalize && "capitalize")}>{label}</span>
    </label>
  );
}

function DateField({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-[11px] text-[var(--text-3)]">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--bg-0)] px-2 text-[12px] text-[var(--text-2)] outline-none focus:border-[var(--teal)] focus:ring-[3px] focus:ring-[var(--teal-subtle)]"
      />
    </div>
  );
}
