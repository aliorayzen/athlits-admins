"use client";

import { useId, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Date-range filters sent to the server. Billing/due are ISO dates; the page
// widens paid dates into datetimes at the request boundary.
export interface InvoiceDateFilters {
  billingFrom?: string;
  billingTo?: string;
  dueFrom?: string;
  dueTo?: string;
  paidAfter?: string;
  paidBefore?: string;
}

export function countActiveDateFilters(filters: InvoiceDateFilters): number {
  return Object.values(filters).filter(Boolean).length;
}

interface InvoiceFiltersPopoverProps {
  value: InvoiceDateFilters;
  onApply: (next: InvoiceDateFilters) => void;
}

const RANGES: {
  label: string;
  from: keyof InvoiceDateFilters;
  to: keyof InvoiceDateFilters;
}[] = [
  { label: "Billing period", from: "billingFrom", to: "billingTo" },
  { label: "Due date", from: "dueFrom", to: "dueTo" },
  { label: "Paid date", from: "paidAfter", to: "paidBefore" },
];

/**
 * Date-range filter panel. Edits a local draft and only commits on Apply, so
 * typing a partial date doesn't fire a refetch on every keystroke.
 */
export function InvoiceFiltersPopover({
  value,
  onApply,
}: InvoiceFiltersPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<InvoiceDateFilters>(value);
  const activeCount = countActiveDateFilters(value);

  // Re-seed the draft from the committed value whenever the panel opens, so a
  // cancelled edit (close without Apply) is discarded. Done in the open handler
  // (an event), not an effect, to avoid a synchronous setState-in-effect.
  function handleOpenChange(next: boolean) {
    if (next) setDraft(value);
    setOpen(next);
  }

  function setField(key: keyof InvoiceDateFilters, raw: string) {
    setDraft((prev) => ({ ...prev, [key]: raw || undefined }));
  }

  function apply() {
    onApply(draft);
    setOpen(false);
  }

  function clearAll() {
    setDraft({});
    onApply({});
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={(props) => (
          <button
            {...props}
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-[13px] transition-colors",
              activeCount > 0
                ? "border-[rgba(0,212,170,0.3)] bg-[var(--teal-subtle)] text-[var(--teal-text)]"
                : "border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-2)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]",
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Dates
            {activeCount > 0 && (
              <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[var(--teal)] px-1 font-mono text-[10px] font-semibold tabular-nums text-[var(--bg-0)]">
                {activeCount}
              </span>
            )}
          </button>
        )}
      />
      <PopoverContent
        align="end"
        className="w-[300px] border-[var(--border)] bg-[var(--bg-1)] p-4"
      >
        <div className="space-y-3.5">
          {RANGES.map((range) => (
            <RangeField
              key={range.label}
              label={range.label}
              fromValue={draft[range.from] ?? ""}
              toValue={draft[range.to] ?? ""}
              onFrom={(v) => setField(range.from, v)}
              onTo={(v) => setField(range.to, v)}
            />
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={clearAll}
            disabled={countActiveDateFilters(draft) === 0}
            className="h-8 px-2 text-[12px] text-[var(--text-3)] hover:text-[var(--text-1)]"
          >
            Clear all
          </Button>
          <Button
            type="button"
            onClick={apply}
            className="h-8 bg-[var(--teal)] px-3 text-[12px] font-medium text-[var(--bg-0)] hover:brightness-110"
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RangeField({
  label,
  fromValue,
  toValue,
  onFrom,
  onTo,
}: {
  label: string;
  fromValue: string;
  toValue: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
}) {
  const fromId = useId();
  const toId = useId();
  const fieldClass =
    "h-8 border-[var(--border)] bg-[var(--bg-2)] px-2 text-[12px] text-[var(--text-1)] focus-visible:border-[var(--teal)] focus-visible:ring-[3px] focus-visible:ring-[var(--teal-subtle)]";

  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-3)]">
        {label}
      </Label>
      <div className="flex items-center gap-1.5">
        <Input
          id={fromId}
          type="date"
          aria-label={`${label} from`}
          value={fromValue}
          max={toValue || undefined}
          onChange={(e) => onFrom(e.target.value)}
          className={fieldClass}
        />
        <span className="text-[11px] text-[var(--text-4)]">to</span>
        <Input
          id={toId}
          type="date"
          aria-label={`${label} to`}
          value={toValue}
          min={fromValue || undefined}
          onChange={(e) => onTo(e.target.value)}
          className={fieldClass}
        />
      </div>
    </div>
  );
}
