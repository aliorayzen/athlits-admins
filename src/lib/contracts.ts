import type {
  ContractResponse,
  CreateContractRequest,
  FeeModel,
} from "@/types/api";
import { DEFAULT_CURRENCY } from "@/lib/currencies";

export interface ContractDraft {
  feeModel: FeeModel;
  perReservationFee: string;
  fixedMonthlyFee: string;
  currencyCode: string;
  gracePeriodDays: number;
  startDate: string;
  endDate: string;
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function defaultContractDraft(
  currencyCode = DEFAULT_CURRENCY,
): ContractDraft {
  return {
    feeModel: "PER_RESERVATION",
    perReservationFee: "2.00",
    fixedMonthlyFee: "100.00",
    currencyCode,
    gracePeriodDays: 30,
    startDate: todayIsoDate(),
    endDate: "",
  };
}

function parseMoney(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function contractDraftError(draft: ContractDraft): string | null {
  const currencyCode = draft.currencyCode.trim().toUpperCase();
  if (currencyCode.length !== 3) return "Select a 3-letter currency code.";
  if (!Number.isInteger(draft.gracePeriodDays)) {
    return "Grace period must be a whole number of days.";
  }
  if (draft.gracePeriodDays < 1 || draft.gracePeriodDays > 180) {
    return "Grace period must be between 1 and 180 days.";
  }
  if (!draft.startDate) return "Select a contract start date.";

  const fee =
    draft.feeModel === "PER_RESERVATION"
      ? parseMoney(draft.perReservationFee)
      : parseMoney(draft.fixedMonthlyFee);

  if (!Number.isFinite(fee) || fee <= 0) {
    return draft.feeModel === "PER_RESERVATION"
      ? "Enter a per-reservation fee greater than zero."
      : "Enter a fixed monthly fee greater than zero.";
  }

  return null;
}

export function isContractDraftValid(draft: ContractDraft): boolean {
  return contractDraftError(draft) === null;
}

export function contractDraftToPayload(
  draft: ContractDraft,
): CreateContractRequest {
  const perReservationFee = parseMoney(draft.perReservationFee);
  const fixedMonthlyFee = parseMoney(draft.fixedMonthlyFee);

  return {
    feeModel: draft.feeModel,
    perReservationFee:
      draft.feeModel === "PER_RESERVATION" ? perReservationFee : null,
    fixedMonthlyFee:
      draft.feeModel === "FIXED_MONTHLY" ? fixedMonthlyFee : null,
    currencyCode: draft.currencyCode.trim().toUpperCase(),
    gracePeriodDays: draft.gracePeriodDays,
    startDate: draft.startDate,
    endDate: draft.endDate || null,
  };
}

export function formatContractFee(contract: ContractResponse): string {
  if (contract.feeModel === "PER_RESERVATION") {
    return `${contract.currencyCode} ${Number(
      contract.perReservationFee ?? 0,
    ).toFixed(2)} per reservation`;
  }

  return `${contract.currencyCode} ${Number(
    contract.fixedMonthlyFee ?? 0,
  ).toFixed(2)} monthly`;
}
