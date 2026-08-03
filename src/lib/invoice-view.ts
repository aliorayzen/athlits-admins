import type {
  InvoiceFeeModel,
  InvoiceLineResponse,
  InvoiceResponse,
} from "@/types/api";

/**
 * Single source of truth for the in-app invoice preview and its downloadable
 * document. Wire values are formatted here so both outputs stay identical.
 */

export const INVOICE_DASH = "-";

export function invoiceMoney(
  value: number | null | undefined,
  currency: string,
): string {
  if (value == null || Number.isNaN(value)) return INVOICE_DASH;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} ${currency}`;
}

export function invoiceIsoDay(value: string | null | undefined): string {
  if (!value) return INVOICE_DASH;
  return value.slice(0, 10);
}

export function invoiceNumber(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

/** Prefer the canonical wire total, retaining `amount` only for rollout safety. */
export function invoiceAmountDue(invoice: InvoiceResponse): number {
  return invoice.amountDue ?? invoice.amount;
}

const FEE_MODEL_LABEL: Record<InvoiceFeeModel, string> = {
  PER_RESERVATION: "Per reservation",
  FIXED_MONTHLY: "Fixed monthly",
};

export interface InvoiceChargeView {
  key: string;
  description: string;
  note: string;
  quantity: string;
  rate: string;
  amount: string;
}

export interface InvoiceView {
  number: string;
  status: string;
  dueDate: string;
  amountDue: string;
  venueDisplay: string;
  venueAr: string;
  billingPeriod: string;
  feeModelLabel: string;
  bookings: string;
  totalRevenue: string;
  charges: InvoiceChargeView[];
  chargesSubtotal: string;
  paidAt: string;
  paymentReference: string;
}

function lineNote(line: InvoiceLineResponse): string {
  const parts = [
    `Contract #${line.contractId}`,
    `${invoiceIsoDay(line.servicePeriodStart)} to ${invoiceIsoDay(
      line.servicePeriodEnd,
    )}`,
  ];

  if (line.coveredDays > 0 && line.daysInMonth > 0) {
    parts.push(`${line.coveredDays} of ${line.daysInMonth} days covered`);
  }
  if (line.totalRevenue > 0) {
    parts.push(invoiceMoney(line.totalRevenue, line.currencyCode) + " revenue");
  }

  return parts.join(" · ");
}

function chargeFromLine(
  line: InvoiceLineResponse,
  index: number,
): InvoiceChargeView {
  const isFixed = line.feeModel === "FIXED_MONTHLY";
  const bookings = line.totalBookings ?? 0;
  const quantity = isFixed
    ? line.coveredDays > 0 && line.daysInMonth > 0
      ? `${line.coveredDays} / ${line.daysInMonth} days`
      : INVOICE_DASH
    : `${bookings} ${bookings === 1 ? "booking" : "bookings"}`;
  const rate = isFixed ? line.fixedMonthlyFee : line.perReservationFee;

  return {
    key: `${line.contractId}-${line.servicePeriodStart}-${index}`,
    description: isFixed ? "Fixed monthly fee" : "Per-reservation fee",
    note: lineNote(line),
    quantity,
    rate: invoiceMoney(rate, line.currencyCode),
    amount: invoiceMoney(line.amountDue, line.currencyCode),
  };
}

function legacyCharge(invoice: InvoiceResponse): InvoiceChargeView {
  const amountDue = invoiceAmountDue(invoice);
  const bookings = invoice.totalBookings ?? 0;
  const isReservation = invoice.feeModel === "PER_RESERVATION";
  const description =
    invoice.feeModel === "FIXED_MONTHLY"
      ? "Fixed monthly fee"
      : isReservation
        ? "Per-reservation fee"
        : "Platform fee";
  const noteParts = [];

  if (invoice.contractId) noteParts.push(`Contract #${invoice.contractId}`);
  noteParts.push(
    `${invoiceIsoDay(invoice.billingPeriodStart ?? invoice.periodStart)} to ${invoiceIsoDay(
      invoice.billingPeriodEnd ?? invoice.periodEnd,
    )}`,
  );

  return {
    key: `legacy-${invoice.id}`,
    description,
    note: noteParts.join(" · "),
    quantity: isReservation
      ? `${bookings} ${bookings === 1 ? "booking" : "bookings"}`
      : INVOICE_DASH,
    rate: invoiceMoney(
      isReservation ? invoice.perReservationFee : invoice.fixedMonthlyFee,
      invoice.currencyCode,
    ),
    amount: invoiceMoney(amountDue, invoice.currencyCode),
  };
}

function feeModelSummary(invoice: InvoiceResponse): string {
  const models = [
    ...new Set((invoice.lines ?? []).map((line) => line.feeModel)),
  ];

  if (models.length > 1) return `Mixed (${invoice.lines?.length ?? 0} periods)`;
  if (models.length === 1) {
    const suffix = (invoice.lines?.length ?? 0) > 1
      ? ` (${invoice.lines?.length} periods)`
      : "";
    return `${FEE_MODEL_LABEL[models[0]]}${suffix}`;
  }
  return invoice.feeModel ? FEE_MODEL_LABEL[invoice.feeModel] : INVOICE_DASH;
}

export function deriveInvoiceView(invoice: InvoiceResponse): InvoiceView {
  const currency = invoice.currencyCode || "USD";
  const amountDue = invoiceAmountDue(invoice);
  const lines = invoice.lines ?? [];
  const bookings =
    invoice.totalBookings ??
    lines.reduce((sum, line) => sum + (line.totalBookings ?? 0), 0);
  const totalRevenue =
    invoice.totalRevenue ??
    lines.reduce((sum, line) => sum + (line.totalRevenue ?? 0), 0);
  const charges =
    lines.length > 0
      ? lines.map(chargeFromLine)
      : [legacyCharge(invoice)];
  const chargesSubtotal =
    lines.length > 0
      ? lines.reduce((sum, line) => sum + line.amountDue, 0)
      : amountDue;

  const venueEnLabel = invoice.venueNameEn?.trim() || invoice.venueName?.trim();
  const venueDisplay = venueEnLabel
    ? `${venueEnLabel} (#${invoice.venueId})`
    : `Venue #${invoice.venueId}`;

  return {
    number: invoiceNumber(invoice.id),
    status: invoice.status,
    dueDate: invoiceIsoDay(invoice.dueDate),
    amountDue: invoiceMoney(amountDue, currency),
    venueDisplay,
    venueAr: invoice.venueNameAr?.trim() || "Not provided",
    billingPeriod: `${invoiceIsoDay(
      invoice.billingPeriodStart ?? invoice.periodStart,
    )} to ${invoiceIsoDay(invoice.billingPeriodEnd ?? invoice.periodEnd)}`,
    feeModelLabel: feeModelSummary(invoice),
    bookings: String(bookings),
    totalRevenue: invoiceMoney(totalRevenue, currency),
    charges,
    chargesSubtotal: invoiceMoney(chargesSubtotal, currency),
    paidAt: invoiceIsoDay(invoice.paidAt),
    paymentReference: invoice.paymentReference?.trim() || INVOICE_DASH,
  };
}
