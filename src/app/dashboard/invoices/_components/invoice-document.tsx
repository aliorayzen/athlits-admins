import type { InvoiceResponse } from "@/types/api";
import { ATHLITS_INVOICE_LOGO } from "./invoice-logo";

/**
 * Live, data-driven reproduction of the Athlits invoice template
 * (`arena_scr_invoice_template.html`), bound field-for-field to
 * `InvoiceResponse`. Rendered in-app as the invoice preview so what an operator
 * sees always reflects the same invoice record the table row does — the
 * document and the dashboard stay in sync because they read one source object.
 *
 * The document keeps its own light "paper" color world (scoped `.invoice-doc`
 * in globals.css) rather than the dark app tokens: an invoice is a printable
 * document, and this mirrors the backend-rendered PDF. Print styling lives in
 * the same scoped block so "Print / Save PDF" outputs exactly this markup.
 */

// Placeholder for absent values. Plain hyphen matches the source invoice
// template (and the backend-rendered PDF) so the document reads identically.
const DASH = "-";

// `123.4` -> `123.40 USD`. Returns an em dash for absent values so empty rows
// read as intentionally blank rather than `0.00`.
function money(value: number | null | undefined, currency: string): string {
  if (value == null || Number.isNaN(value)) return DASH;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} ${currency}`;
}

// Invoice dates are plain ISO days on the wire; render the day only (no TZ shift
// from `new Date()`), matching the source template's `2026-06-30` style.
function isoDay(value: string | null | undefined): string {
  if (!value) return DASH;
  return value.slice(0, 10);
}

// The backend id is a UUID; the dashboard identifies invoices by their first 8
// chars everywhere, so the document number follows that same convention.
function invoiceNumber(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

const FEE_MODEL_LABEL: Record<
  NonNullable<InvoiceResponse["feeModel"]>,
  string
> = {
  PER_RESERVATION: "PER_RESERVATION",
  FIXED_MONTHLY: "FIXED_MONTHLY",
};

interface InvoiceDocumentProps {
  invoice: InvoiceResponse;
}

export function InvoiceDocument({ invoice }: InvoiceDocumentProps) {
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
  const feeModelLabel = invoice.feeModel
    ? FEE_MODEL_LABEL[invoice.feeModel]
    : DASH;

  return (
    <article className="invoice-doc" aria-label="Athlits invoice">
      <header className="invoice-doc__top">
        <div>
          <div className="invoice-doc__brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ATHLITS_INVOICE_LOGO} alt="Athlits" />
          </div>
          <h1 className="invoice-doc__title">Athlits Invoice</h1>
          <div className="invoice-doc__number">
            Invoice #{invoiceNumber(invoice.id)}
          </div>
        </div>

        <div className="invoice-doc__amount">
          <div className="invoice-doc__amount-label">Amount due</div>
          <div className="invoice-doc__amount-value">
            {money(amountDue, currency)}
          </div>
          <div className="invoice-doc__meta">
            Status: {invoice.status}
            <br />
            Due date: {isoDay(invoice.dueDate)}
          </div>
        </div>
      </header>

      <section className="invoice-doc__info" aria-label="Invoice information">
        <div>
          <h2 className="invoice-doc__section-title">Venue</h2>
          <Row label="Venue EN" value={venueDisplay} />
          <Row label="Venue AR" value={venueAr || "Not provided"} />
          <Row
            label="Billing period"
            value={`${isoDay(invoice.billingPeriodStart ?? invoice.periodStart)} to ${isoDay(
              invoice.billingPeriodEnd ?? invoice.periodEnd,
            )}`}
          />
        </div>

        <div>
          <h2 className="invoice-doc__section-title">Summary</h2>
          <Row label="Fee model" value={feeModelLabel} />
          <Row label="Total bookings" value={String(bookings)} />
          <Row
            label="Total revenue"
            value={money(invoice.totalRevenue, currency)}
          />
        </div>
      </section>

      <table className="invoice-doc__table" aria-label="Invoice charges">
        <thead>
          <tr>
            <th>Charge</th>
            <th className="invoice-doc__num">Qty</th>
            <th className="invoice-doc__num">Rate</th>
            <th className="invoice-doc__num">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div className="invoice-doc__item">Reservation billing fee</div>
              <div className="invoice-doc__note">
                {bookings} completed {bookings === 1 ? "booking" : "bookings"}{" "}
                in the billing period.
              </div>
            </td>
            <td className="invoice-doc__num">{bookings || DASH}</td>
            <td className="invoice-doc__num">
              {money(perReservationRate, currency)}
            </td>
            <td className="invoice-doc__num">
              {money(perReservationAmount, currency)}
            </td>
          </tr>
          <tr>
            <td>
              <div className="invoice-doc__item">Fixed monthly fee</div>
              <div className="invoice-doc__note">
                {hasFixedFee
                  ? "Fixed monthly fee for the billing period."
                  : "No fixed monthly fee applied."}
              </div>
            </td>
            <td className="invoice-doc__num">{DASH}</td>
            <td className="invoice-doc__num">{DASH}</td>
            <td className="invoice-doc__num">{money(fixedAmount, currency)}</td>
          </tr>
        </tbody>
      </table>

      <section className="invoice-doc__after-table">
        <div className="invoice-doc__payment-note">
          <strong>Payment</strong>
          Paid at: {isoDay(invoice.paidAt)}
          <br />
          Payment reference: {invoice.paymentReference?.trim() || DASH}
        </div>

        <div className="invoice-doc__totals" aria-label="Invoice totals">
          <TotalRow
            label="Total revenue"
            value={money(invoice.totalRevenue, currency)}
          />
          <TotalRow
            label="Fixed monthly fee"
            value={hasFixedFee ? money(fixedAmount, currency) : DASH}
          />
          <TotalRow
            label="Per reservation fee"
            value={
              invoice.feeModel === "PER_RESERVATION" ||
              perReservationRate != null
                ? money(perReservationAmount, currency)
                : DASH
            }
          />
          <TotalRow
            final
            label="Amount due"
            value={money(amountDue, currency)}
          />
        </div>
      </section>

      <footer className="invoice-doc__footer">
        <span>Athlits venue billing</span>
        <span>Generated for {venueDisplay}</span>
      </footer>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="invoice-doc__row">
      <div className="invoice-doc__label">{label}</div>
      <div className="invoice-doc__value">{value}</div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  final,
}: {
  label: string;
  value: string;
  final?: boolean;
}) {
  return (
    <div
      className={
        final
          ? "invoice-doc__total-row invoice-doc__total-row--final"
          : "invoice-doc__total-row"
      }
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
