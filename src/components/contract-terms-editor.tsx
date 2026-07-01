"use client";

import { useId } from "react";
import { Banknote, CalendarDays } from "lucide-react";

import { CURRENCY_OPTIONS } from "@/lib/currencies";
import type { ContractDraft } from "@/lib/contracts";
import type { FeeModel } from "@/types/api";
import { cn } from "@/lib/utils";

const FEE_MODELS: Array<{
  value: FeeModel;
  label: string;
  note: string;
}> = [
  {
    value: "PER_RESERVATION",
    label: "Per reservation",
    note: "Charge every completed reservation.",
  },
  {
    value: "FIXED_MONTHLY",
    label: "Fixed monthly",
    note: "Charge one recurring monthly fee.",
  },
];

export function ContractTermsEditor({
  draft,
  onChange,
  inputClassName,
  labelClassName,
  className,
  disabled,
}: {
  draft: ContractDraft;
  onChange: (patch: Partial<ContractDraft>) => void;
  inputClassName: string;
  labelClassName: string;
  className?: string;
  disabled?: boolean;
}) {
  const feeModelLabelId = useId();
  const feeInputId = useId();
  const currencyId = useId();
  const graceId = useId();
  const startDateId = useId();
  const endDateId = useId();
  const feeValue =
    draft.feeModel === "PER_RESERVATION"
      ? draft.perReservationFee
      : draft.fixedMonthlyFee;

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <div id={feeModelLabelId} className={labelClassName}>
          Fee model
          <span className="ml-1 text-[var(--semantic-red)]">*</span>
        </div>
        <div
          role="radiogroup"
          aria-labelledby={feeModelLabelId}
          className="mt-2 grid gap-3 sm:grid-cols-2"
        >
          {FEE_MODELS.map((model) => {
            const active = draft.feeModel === model.value;
            return (
              <button
                key={model.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                onClick={() => onChange({ feeModel: model.value })}
                className={cn(
                  "rounded-lg border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60",
                  active
                    ? "border-[rgba(0,212,170,0.3)] bg-[rgba(0,212,170,0.08)]"
                    : "border-[var(--border)] bg-[var(--bg-0)] hover:border-[var(--border-strong)]",
                )}
              >
                <Banknote
                  className={cn(
                    "mb-2 h-4 w-4",
                    active ? "text-[var(--teal-text)]" : "text-[var(--text-4)]",
                  )}
                />
                <span className="block text-[13px] font-semibold text-[var(--text-1)]">
                  {model.label}
                </span>
                <span className="mt-1 block text-[12px] leading-5 text-[var(--text-3)]">
                  {model.note}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor={feeInputId} className={labelClassName}>
            {draft.feeModel === "PER_RESERVATION"
              ? "Per-reservation fee"
              : "Fixed monthly fee"}
            <span className="ml-1 text-[var(--semantic-red)]">*</span>
          </label>
          <input
            id={feeInputId}
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            disabled={disabled}
            value={feeValue}
            onChange={(e) =>
              draft.feeModel === "PER_RESERVATION"
                ? onChange({ perReservationFee: e.target.value })
                : onChange({ fixedMonthlyFee: e.target.value })
            }
            className={cn(
              "h-9 w-full rounded-md border px-3 text-sm outline-none transition-all",
              inputClassName,
            )}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor={currencyId} className={labelClassName}>
            Currency
            <span className="ml-1 text-[var(--semantic-red)]">*</span>
          </label>
          <select
            id={currencyId}
            disabled={disabled}
            value={draft.currencyCode}
            onChange={(e) => onChange({ currencyCode: e.target.value })}
            className={cn(
              "h-9 w-full rounded-md border px-3 text-sm outline-none transition-all",
              inputClassName,
            )}
          >
            {CURRENCY_OPTIONS.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} - {currency.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor={graceId} className={labelClassName}>
            Grace period days
            <span className="ml-1 text-[var(--semantic-red)]">*</span>
          </label>
          <input
            id={graceId}
            type="number"
            min={1}
            max={180}
            step={1}
            disabled={disabled}
            value={draft.gracePeriodDays}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10);
              onChange({
                gracePeriodDays: Number.isFinite(parsed) ? parsed : 30,
              });
            }}
            className={cn(
              "h-9 w-full rounded-md border px-3 text-sm outline-none transition-all",
              inputClassName,
            )}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor={startDateId} className={labelClassName}>
            Start date
            <span className="ml-1 text-[var(--semantic-red)]">*</span>
          </label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-4)]" />
            <input
              id={startDateId}
              type="date"
              disabled={disabled}
              value={draft.startDate}
              onChange={(e) => onChange({ startDate: e.target.value })}
              className={cn(
                "h-9 w-full rounded-md border pl-9 pr-3 text-sm outline-none transition-all",
                inputClassName,
              )}
            />
          </div>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor={endDateId} className={labelClassName}>
            End date
          </label>
          <input
            id={endDateId}
            type="date"
            disabled={disabled}
            value={draft.endDate}
            onChange={(e) => onChange({ endDate: e.target.value })}
            className={cn(
              "h-9 w-full rounded-md border px-3 text-sm outline-none transition-all",
              inputClassName,
            )}
          />
          <p className="text-[12px] leading-5 text-[var(--text-4)]">
            Leave blank for an open-ended active contract.
          </p>
        </div>
      </div>
    </div>
  );
}
