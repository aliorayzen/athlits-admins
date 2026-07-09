import type { InvoiceResponse } from "@/types/api";

/**
 * Single source of truth for how an `InvoiceResponse` is presented as a
 * document. Both the in-app preview (`<InvoiceDocument />`) and the downloadable
 * template (`downloadInvoiceTemplate` in `export.ts`) derive their display
 * strings here, so the two artifacts can never drift — the preview shows exactly
 * what the downloaded PDF contains.
 */

// Placeholder for absent values. Plain hyphen matches the source invoice
// template (`arena_scr_invoice_template.html`) so the document reads identically.
export const INVOICE_DASH = "-";

// `123.4` -> `123.40 USD`. Returns the dash for absent values so empty rows read
// as intentionally blank rather than `0.00`.
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

// Invoice dates are plain ISO days on the wire; render the day only (no TZ shift
// from `new Date()`), matching the template's `2026-06-30` style.
export function invoiceIsoDay(value: string | null | undefined): string {
  if (!value) return INVOICE_DASH;
  return value.slice(0, 10);
}

// The backend id is a UUID; the dashboard identifies invoices by their first 8
// chars everywhere, so the document number follows that same convention.
export function invoiceNumber(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

const FEE_MODEL_LABEL: Record<
  NonNullable<InvoiceResponse["feeModel"]>,
  string
> = {
  PER_RESERVATION: "PER_RESERVATION",
  FIXED_MONTHLY: "FIXED_MONTHLY",
};

/** Every field the invoice document renders, pre-formatted as display strings. */
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
  reservationNote: string;
  reservationQty: string;
  reservationRate: string;
  reservationAmount: string;
  fixedNote: string;
  fixedAmount: string;
  paidAt: string;
  paymentReference: string;
  totalsFixed: string;
  totalsPerReservation: string;
}

export function deriveInvoiceView(invoice: InvoiceResponse): InvoiceView {
  const currency = invoice.currencyCode || "USD";
  const amountDue = invoice.amountDue ?? invoice.amount;

  const venueEnLabel = invoice.venueNameEn?.trim() || invoice.venueName?.trim();
  const venueDisplay = venueEnLabel
    ? `${venueEnLabel} (#${invoice.venueId})`
    : `Venue #${invoice.venueId}`;
  const venueAr = invoice.venueNameAr?.trim();

  const bookings = invoice.totalBookings ?? 0;
  const perReservationRate = invoice.perReservationFee ?? null;
  const fixedMonthlyFee = invoice.fixedMonthlyFee ?? null;

  // Per-reservation charge = rate × completed bookings. Falls back to the
  // canonical amount due when a granular rate isn't supplied but the invoice is
  // per-reservation, so the line and the total never disagree.
  const perReservationAmount =
    perReservationRate != null
      ? perReservationRate * bookings
      : invoice.feeModel === "PER_RESERVATION"
        ? amountDue
        : 0;

  const fixedAmount = fixedMonthlyFee ?? 0;
  const hasFixedFee = fixedMonthlyFee != null && fixedMonthlyFee > 0;

  return {
    number: invoiceNumber(invoice.id),
    status: invoice.status,
    dueDate: invoiceIsoDay(invoice.dueDate),
    amountDue: invoiceMoney(amountDue, currency),
    venueDisplay,
    venueAr: venueAr || "Not provided",
    billingPeriod: `${invoiceIsoDay(
      invoice.billingPeriodStart ?? invoice.periodStart,
    )} to ${invoiceIsoDay(invoice.billingPeriodEnd ?? invoice.periodEnd)}`,
    feeModelLabel: invoice.feeModel
      ? FEE_MODEL_LABEL[invoice.feeModel]
      : INVOICE_DASH,
    bookings: String(bookings),
    totalRevenue: invoiceMoney(invoice.totalRevenue, currency),
    reservationNote: `${bookings} completed ${
      bookings === 1 ? "booking" : "bookings"
    } in the billing period.`,
    reservationQty: bookings ? String(bookings) : INVOICE_DASH,
    reservationRate: invoiceMoney(perReservationRate, currency),
    reservationAmount: invoiceMoney(perReservationAmount, currency),
    fixedNote: hasFixedFee
      ? "Fixed monthly fee for the billing period."
      : "No fixed monthly fee applied.",
    fixedAmount: invoiceMoney(fixedAmount, currency),
    paidAt: invoiceIsoDay(invoice.paidAt),
    paymentReference: invoice.paymentReference?.trim() || INVOICE_DASH,
    totalsFixed: hasFixedFee
      ? invoiceMoney(fixedAmount, currency)
      : INVOICE_DASH,
    totalsPerReservation:
      invoice.feeModel === "PER_RESERVATION" || perReservationRate != null
        ? invoiceMoney(perReservationAmount, currency)
        : INVOICE_DASH,
  };
}
