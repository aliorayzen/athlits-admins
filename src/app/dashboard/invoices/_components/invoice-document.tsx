import type { InvoiceResponse } from "@/types/api";
import { deriveInvoiceView, INVOICE_DASH } from "@/lib/invoice-view";
import { ATHLITS_INVOICE_LOGO } from "./invoice-logo";

/**
 * Live, data-driven reproduction of the Athlits invoice template
 * (`arena_scr_invoice_template.html`), bound field-for-field to
 * `InvoiceResponse` via `deriveInvoiceView` — the same derivation the
 * downloadable template uses, so the in-app preview and the saved PDF can never
 * disagree.
 *
 * The document keeps its own light "paper" color world (scoped `.invoice-doc`
 * in globals.css) rather than the dark app tokens: an invoice is a printable
 * document. The `.invoice-doc-shell` wrapper is a CSS container so the layout
 * responds to its own width (the preview surface) instead of the viewport —
 * critical because the document renders inside a dialog narrower than the page.
 * Print styling lives in the same scoped block so "Print / Save PDF" outputs
 * exactly this markup.
 */

interface InvoiceDocumentProps {
  invoice: InvoiceResponse;
}

export function InvoiceDocument({ invoice }: InvoiceDocumentProps) {
  const v = deriveInvoiceView(invoice);

  return (
    <div className="invoice-doc-shell">
      <article className="invoice-doc" aria-label="Athlits invoice">
        <header className="invoice-doc__top">
          <div>
            <div className="invoice-doc__brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ATHLITS_INVOICE_LOGO} alt="Athlits" />
            </div>
            <h1 className="invoice-doc__title">Athlits Invoice</h1>
            <div className="invoice-doc__number">Invoice #{v.number}</div>
          </div>

          <div className="invoice-doc__amount">
            <div className="invoice-doc__amount-label">Amount due</div>
            <div className="invoice-doc__amount-value">{v.amountDue}</div>
            <div className="invoice-doc__meta">
              Status: {v.status}
              <br />
              Due date: {v.dueDate}
            </div>
          </div>
        </header>

        <section className="invoice-doc__info" aria-label="Invoice information">
          <div>
            <h2 className="invoice-doc__section-title">Venue</h2>
            <Row label="Venue EN" value={v.venueDisplay} />
            <Row label="Venue AR" value={v.venueAr} />
            <Row label="Billing period" value={v.billingPeriod} />
          </div>

          <div>
            <h2 className="invoice-doc__section-title">Summary</h2>
            <Row label="Fee model" value={v.feeModelLabel} />
            <Row label="Total bookings" value={v.bookings} />
            <Row label="Total revenue" value={v.totalRevenue} />
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
                <div className="invoice-doc__note">{v.reservationNote}</div>
              </td>
              <td className="invoice-doc__num">{v.reservationQty}</td>
              <td className="invoice-doc__num">{v.reservationRate}</td>
              <td className="invoice-doc__num">{v.reservationAmount}</td>
            </tr>
            <tr>
              <td>
                <div className="invoice-doc__item">Fixed monthly fee</div>
                <div className="invoice-doc__note">{v.fixedNote}</div>
              </td>
              <td className="invoice-doc__num">{INVOICE_DASH}</td>
              <td className="invoice-doc__num">{INVOICE_DASH}</td>
              <td className="invoice-doc__num">{v.fixedAmount}</td>
            </tr>
          </tbody>
        </table>

        <section className="invoice-doc__after-table">
          <div className="invoice-doc__payment-note">
            <strong>Payment</strong>
            Paid at: {v.paidAt}
            <br />
            Payment reference: {v.paymentReference}
          </div>

          <div className="invoice-doc__totals" aria-label="Invoice totals">
            <TotalRow label="Total revenue" value={v.totalRevenue} />
            <TotalRow label="Fixed monthly fee" value={v.totalsFixed} />
            <TotalRow
              label="Per reservation fee"
              value={v.totalsPerReservation}
            />
            <TotalRow final label="Amount due" value={v.amountDue} />
          </div>
        </section>

        <footer className="invoice-doc__footer">
          <span>Athlits venue billing</span>
          <span>Generated for {v.venueDisplay}</span>
        </footer>
      </article>
    </div>
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
