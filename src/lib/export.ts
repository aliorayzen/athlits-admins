/**
 * Client-side CSV and PDF export utilities.
 * No external dependencies -- uses browser-native APIs.
 */

import type { InvoiceResponse } from "@/types/api";

function escapeCSV(value: string | number | undefined | null): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCSV(
  filename: string,
  headers: string[],
  rows: (string | number | undefined | null)[][],
) {
  const headerLine = headers.map(escapeCSV).join(",");
  const dataLines = rows.map((row) => row.map(escapeCSV).join(","));
  const csv = [headerLine, ...dataLines].join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filename}.csv`);
}

/** Escape untrusted text before interpolating into the export HTML. */
function escapeHTML(value: string | number | undefined | null): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Athlits brand palette mirrored from DESIGN.md (the export doc is a
 *  standalone blob and cannot read globals.css tokens). */
const PDF_THEME = {
  page: "#08090c",
  panel: "#0f1115",
  panelRaised: "#161a1f",
  text1: "#f2f3f5",
  text2: "#b8bcc5",
  text3: "#838999",
  text4: "#555d6e",
  border: "rgba(255,255,255,0.07)",
  borderStrong: "rgba(255,255,255,0.13)",
  teal: "#00d4aa",
  tealText: "#1de9b6",
  gold: "#f59e0b",
  green: "#10b981",
  red: "#f43f5e",
  blue: "#6366f1",
} as const;

// Status → pill tone. Keys match the InvoiceStatus union the table emits.
const STATUS_TONE: Record<string, { fg: string; bg: string; bd: string }> = {
  PAID: {
    fg: "#34d8a8",
    bg: "rgba(16,185,129,0.12)",
    bd: "rgba(16,185,129,0.3)",
  },
  OVERDUE: {
    fg: "#fb7185",
    bg: "rgba(244,63,94,0.12)",
    bd: "rgba(244,63,94,0.3)",
  },
  GENERATED: {
    fg: "#1de9b6",
    bg: "rgba(0,212,170,0.1)",
    bd: "rgba(0,212,170,0.28)",
  },
  VOID: {
    fg: "#838999",
    bg: "rgba(255,255,255,0.05)",
    bd: "rgba(255,255,255,0.12)",
  },
};

type ColumnRole = "num" | "status" | "mono" | "text";

function columnRole(header: string): ColumnRole {
  const k = header.toLowerCase();
  if (k.includes("amount") || k.includes("total") || k.includes("value"))
    return "num";
  if (k.includes("status")) return "status";
  if (k.includes("invoice") || k === "id" || k.includes("ref")) return "mono";
  return "text";
}

function renderStatusPill(value: string): string {
  const key = value.trim().toUpperCase();
  const tone = STATUS_TONE[key] ?? {
    fg: PDF_THEME.text3,
    bg: "rgba(255,255,255,0.05)",
    bd: PDF_THEME.border,
  };
  return `<span style="display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:999px;border:1px solid ${tone.bd};background:${tone.bg};color:${tone.fg};font-size:10px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase"><span style="width:5px;height:5px;border-radius:999px;background:${tone.fg}"></span>${escapeHTML(value)}</span>`;
}

const MONO_STACK =
  '"Geist Mono", ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace';

/**
 * Open a print-ready, Athlits-themed report in a new tab.
 *
 * The document is a self-contained dark-luxury surface mirroring the app
 * theme (deep zinc canvas, teal accent, mono numerics) so an exported PDF
 * reads as part of the product rather than a generic table dump.
 */
export function downloadPDF(
  title: string,
  filename: string,
  headers: string[],
  rows: (string | number | undefined | null)[][],
  meta?: { label: string; value: string }[],
) {
  const T = PDF_THEME;
  const roles = headers.map(columnRole);

  const metaHTML = meta
    ? meta
        .map((m, i) => {
          // Highlight the monetary summary (last card by convention).
          const isMoney = /value|total/i.test(m.label);
          const accent = isMoney ? T.tealText : T.text1;
          return `<div style="flex:1;min-width:0;padding:13px 16px;${i > 0 ? `border-left:1px solid ${T.border};` : ""}">
            <div style="font-size:9.5px;font-weight:600;letter-spacing:0.09em;text-transform:uppercase;color:${T.text4}">${escapeHTML(m.label)}</div>
            <div style="margin-top:5px;font-size:15px;font-weight:700;letter-spacing:-0.01em;color:${accent};font-family:${isMoney ? MONO_STACK : "inherit"}">${escapeHTML(m.value)}</div>
          </div>`;
        })
        .join("")
    : "";

  const headHTML = headers
    .map((h, i) => {
      const align = roles[i] === "num" ? "right" : "left";
      return `<th style="text-align:${align};padding:11px 14px;font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:${T.text4};border-bottom:1px solid ${T.borderStrong};white-space:nowrap">${escapeHTML(h)}</th>`;
    })
    .join("");

  const bodyHTML = rows
    .map((row, r) => {
      const zebra = r % 2 === 1 ? "background:rgba(255,255,255,0.012);" : "";
      const cells = row
        .map((cell, i) => {
          const role = roles[i] ?? "text";
          const base = `padding:10px 14px;border-bottom:1px solid ${T.border};font-size:11.5px;vertical-align:middle;`;
          if (role === "status") {
            return `<td style="${base}">${renderStatusPill(String(cell ?? ""))}</td>`;
          }
          if (role === "num") {
            return `<td style="${base}text-align:right;font-family:${MONO_STACK};font-variant-numeric:tabular-nums;font-weight:600;color:${T.text1}">${escapeHTML(cell)}</td>`;
          }
          if (role === "mono") {
            return `<td style="${base}font-family:${MONO_STACK};font-variant-numeric:tabular-nums;color:${T.text2}">${escapeHTML(cell)}</td>`;
          }
          return `<td style="${base}color:${T.text2}">${escapeHTML(cell)}</td>`;
        })
        .join("");
      return `<tr style="${zebra}">${cells}</tr>`;
    })
    .join("");

  const generatedOn = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const recordLabel = `${rows.length} record${rows.length !== 1 ? "s" : ""}`;

  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<title>${escapeHTML(title)}</title>
<style>
  @page { size: A4; margin: 0; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  * { box-sizing: border-box; }
  body {
    font-family: "Geist", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: ${T.text1};
    background: ${T.page};
    margin: 0;
    padding: 28px;
    -webkit-font-smoothing: antialiased;
  }
  .doc {
    max-width: 900px;
    margin: 0 auto;
    background:
      radial-gradient(120% 80% at 100% 0%, rgba(0,212,170,0.06), transparent 55%),
      ${T.panel};
    border: 1px solid ${T.border};
    border-radius: 14px;
    overflow: hidden;
  }
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    padding: 24px 28px 20px;
    border-bottom: 1px solid ${T.border};
  }
  .brand { display: flex; align-items: center; gap: 11px; }
  .brand .wm { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; color: ${T.text1}; line-height: 1.1; }
  .brand .sub { margin-top: 2px; font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.09em; color: ${T.tealText}; }
  .head .right { text-align: right; }
  .head .title { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; color: ${T.text1}; }
  .head .gen { margin-top: 4px; font-size: 11px; color: ${T.text3}; }
  .accent-rule { height: 2px; background: linear-gradient(90deg, ${T.teal}, rgba(0,212,170,0) 70%); }
  .meta { display: flex; flex-wrap: wrap; border-bottom: 1px solid ${T.border}; }
  .table-wrap { padding: 4px 6px 6px; }
  table { width: 100%; border-collapse: separate; border-spacing: 0; }
  tbody tr:last-child td { border-bottom: none; }
  .footer {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 28px; border-top: 1px solid ${T.border};
    font-size: 11px; color: ${T.text4};
  }
  .footer .lhs { display: flex; align-items: center; gap: 7px; }
  .footer .dot { width: 6px; height: 6px; border-radius: 999px; background: ${T.teal}; box-shadow: 0 0 6px rgba(0,212,170,0.6); }
</style>
</head><body>
  <div class="doc">
    <div class="head">
      <div class="brand">
        ${brandMarkSVG()}
        <div>
          <div class="wm">Athlits</div>
          <div class="sub">Admin Console</div>
        </div>
      </div>
      <div class="right">
        <div class="title">${escapeHTML(title)}</div>
        <div class="gen">Generated ${escapeHTML(generatedOn)}</div>
      </div>
    </div>
    <div class="accent-rule"></div>
    ${metaHTML ? `<div class="meta">${metaHTML}</div>` : ""}
    <div class="table-wrap">
      <table>
        <thead><tr>${headHTML}</tr></thead>
        <tbody>${bodyHTML}</tbody>
      </table>
    </div>
    <div class="footer">
      <span class="lhs"><span class="dot"></span>Athlits Admin Dashboard</span>
      <span>${escapeHTML(recordLabel)}</span>
    </div>
  </div>
</body></html>`;

  openPrintDocument(html);
}

/** Open self-contained HTML in a new tab and trigger the print dialog. */
function openPrintDocument(html: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.addEventListener("load", () => {
      win.print();
      URL.revokeObjectURL(url);
    });
  }
}

/** Inline SVG brand tile — no external asset load to race window.print(). */
function brandMarkSVG(): string {
  return `<svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <rect x="0.5" y="0.5" width="33" height="33" rx="8" fill="url(#athTile)" stroke="rgba(0,212,170,0.28)"/>
    <path d="M17 8.5L24 25.5H20.6L19.1 21.6H14.9L13.4 25.5H10L17 8.5ZM17 13.8L15.6 18.7H18.4L17 13.8Z" fill="${PDF_THEME.tealText}"/>
    <defs>
      <linearGradient id="athTile" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
        <stop stop-color="rgba(0,212,170,0.16)"/>
        <stop offset="1" stop-color="rgba(0,212,170,0.03)"/>
      </linearGradient>
    </defs>
  </svg>`;
}

function fmtMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Guard against a non-ISO currency code reaching Intl.
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface InvoiceLineItem {
  description: string;
  detail: string;
  amount: number;
}

// Reconstruct the billed line item(s) from the fee model. The grand total
// always trusts `amountDue`/`amount` (the canonical wire value).
function buildLineItems(inv: InvoiceResponse): InvoiceLineItem[] {
  const currency = inv.currencyCode;
  const total = inv.amountDue ?? inv.amount;
  const bookings = inv.totalBookings ?? 0;

  if (inv.feeModel === "PER_RESERVATION") {
    const unit = inv.perReservationFee ?? null;
    return [
      {
        description: "Per-reservation fee",
        detail:
          unit !== null
            ? `${fmtMoney(unit, currency)} × ${bookings} ${bookings === 1 ? "booking" : "bookings"}`
            : `${bookings} ${bookings === 1 ? "booking" : "bookings"}`,
        amount: total,
      },
    ];
  }
  if (inv.feeModel === "FIXED_MONTHLY") {
    return [
      {
        description: "Fixed monthly platform fee",
        detail:
          bookings > 0 ? `${bookings} bookings in period` : "Monthly billing",
        amount: inv.fixedMonthlyFee ?? total,
      },
    ];
  }
  return [
    {
      description: "Platform fee",
      detail:
        bookings > 0 ? `${bookings} bookings in period` : "Billing period",
      amount: total,
    },
  ];
}

// Status-aware banner shown above the totals (paid / overdue / due / void).
function invoiceStatusBanner(inv: InvoiceResponse): string {
  const tone = STATUS_TONE[inv.status] ?? STATUS_TONE.GENERATED;
  let message: string;
  switch (inv.status) {
    case "PAID":
      message = inv.paymentReference
        ? `Paid on ${fmtDate(inv.paidAt)} · Ref ${escapeHTML(inv.paymentReference)}`
        : `Paid on ${fmtDate(inv.paidAt)}`;
      break;
    case "OVERDUE":
      message = `Overdue — payment was due ${fmtDate(inv.dueDate)}`;
      break;
    case "VOID":
      message = "This invoice has been voided and is not payable.";
      break;
    default:
      message = `Payment due ${fmtDate(inv.dueDate)}`;
  }
  return `<div style="display:flex;align-items:center;gap:9px;margin:0 28px 18px;padding:11px 15px;border-radius:10px;border:1px solid ${tone.bd};background:${tone.bg};color:${tone.fg};font-size:12px;font-weight:600">
    <span style="width:7px;height:7px;border-radius:999px;background:${tone.fg};box-shadow:0 0 6px ${tone.fg}"></span>${message}</div>`;
}

/**
 * Open a print-ready, Athlits-themed single-invoice document in a new tab.
 *
 * Rendered entirely client-side from the dashboard's `InvoiceResponse` so the
 * artifact matches the product theme. (The backend `/{id}/pdf` endpoint remains
 * the canonical billing PDF for any server-only fields.)
 */
export function downloadInvoiceDocument(inv: InvoiceResponse): void {
  const T = PDF_THEME;
  const shortId = inv.id.slice(0, 8).toUpperCase();
  const venueName = inv.venueName ?? inv.venueId;
  const currency = inv.currencyCode;
  const total = inv.amountDue ?? inv.amount;
  const items = buildLineItems(inv);

  const billedToHTML = `
    <div style="flex:1;min-width:0">
      <div style="font-size:9.5px;font-weight:600;letter-spacing:0.09em;text-transform:uppercase;color:${T.text4}">Billed to</div>
      <div style="margin-top:6px;font-size:14px;font-weight:600;color:${T.text1}">${escapeHTML(venueName)}</div>
      ${inv.venueNameAr ? `<div style="margin-top:1px;font-size:12px;color:${T.text3}" dir="rtl">${escapeHTML(inv.venueNameAr)}</div>` : ""}
      <div style="margin-top:4px;font-size:10.5px;font-family:${MONO_STACK};color:${T.text4}">Venue ${escapeHTML(inv.venueId.slice(0, 8).toUpperCase())}</div>
    </div>`;

  const detailPairs: Array<[string, string]> = [
    ["Issued", fmtDate(inv.createdAt)],
    ["Due", fmtDate(inv.dueDate)],
    [
      "Billing period",
      `${fmtDate(inv.billingPeriodStart ?? inv.periodStart)} – ${fmtDate(inv.billingPeriodEnd ?? inv.periodEnd)}`,
    ],
  ];
  const detailsHTML = `
    <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:7px">
      ${detailPairs
        .map(
          ([k, v]) =>
            `<div style="display:flex;justify-content:space-between;gap:16px"><span style="font-size:11px;color:${T.text3}">${escapeHTML(k)}</span><span style="font-size:11px;font-weight:600;color:${T.text2};font-family:${MONO_STACK}">${escapeHTML(v)}</span></div>`,
        )
        .join("")}
    </div>`;

  const itemsHTML = items
    .map(
      (it) => `<tr>
        <td style="padding:12px 14px;border-bottom:1px solid ${T.border};vertical-align:top">
          <div style="font-size:12.5px;font-weight:600;color:${T.text1}">${escapeHTML(it.description)}</div>
          <div style="margin-top:2px;font-size:11px;color:${T.text3}">${escapeHTML(it.detail)}</div>
        </td>
        <td style="padding:12px 14px;border-bottom:1px solid ${T.border};text-align:right;vertical-align:top;font-family:${MONO_STACK};font-variant-numeric:tabular-nums;font-size:12.5px;font-weight:600;color:${T.text1}">${escapeHTML(fmtMoney(it.amount, currency))}</td>
      </tr>`,
    )
    .join("");

  const revenueNote =
    inv.totalRevenue != null
      ? `<div style="margin-top:6px;font-size:10.5px;color:${T.text4}">Gross venue revenue in period: <span style="font-family:${MONO_STACK};color:${T.text3}">${escapeHTML(fmtMoney(inv.totalRevenue, currency))}</span></div>`
      : "";

  const generatedOn = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<title>Invoice ${escapeHTML(shortId)}</title>
<style>
  @page { size: A4; margin: 0; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  * { box-sizing: border-box; }
  body {
    font-family: "Geist", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: ${T.text1}; background: ${T.page}; margin: 0; padding: 28px;
    -webkit-font-smoothing: antialiased;
  }
  .doc {
    max-width: 720px; margin: 0 auto;
    background: radial-gradient(120% 70% at 100% 0%, rgba(0,212,170,0.06), transparent 55%), ${T.panel};
    border: 1px solid ${T.border}; border-radius: 14px; overflow: hidden;
  }
  .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; padding: 24px 28px 20px; }
  .brand { display: flex; align-items: center; gap: 11px; }
  .brand .wm { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; color: ${T.text1}; line-height: 1.1; }
  .brand .sub { margin-top: 2px; font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.09em; color: ${T.tealText}; }
  .head .right { text-align: right; }
  .head .doctype { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.16em; color: ${T.text4}; }
  .head .num { margin-top: 3px; font-size: 18px; font-weight: 700; letter-spacing: -0.01em; color: ${T.text1}; font-family: ${MONO_STACK}; }
  .head .pill-wrap { margin-top: 8px; }
  .accent-rule { height: 2px; background: linear-gradient(90deg, ${T.teal}, rgba(0,212,170,0) 70%); }
  .parties { display: flex; gap: 28px; padding: 22px 28px; border-bottom: 1px solid ${T.border}; }
  .items-wrap { padding: 8px 22px 4px; }
  table { width: 100%; border-collapse: separate; border-spacing: 0; }
  thead th { text-align: left; padding: 9px 14px; font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: ${T.text4}; border-bottom: 1px solid ${T.borderStrong}; }
  thead th.amt { text-align: right; }
  .totals { display: flex; justify-content: flex-end; padding: 4px 28px 8px; }
  .totals .box { min-width: 240px; }
  .totals .row { display: flex; justify-content: space-between; padding: 7px 0; font-size: 12px; color: ${T.text3}; }
  .totals .grand { margin-top: 4px; padding: 13px 0 4px; border-top: 1px solid ${T.borderStrong}; display: flex; justify-content: space-between; align-items: baseline; }
  .totals .grand .lbl { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.09em; color: ${T.text4}; }
  .totals .grand .val { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: ${T.tealText}; font-family: ${MONO_STACK}; font-variant-numeric: tabular-nums; }
  .footer { display: flex; align-items: center; justify-content: space-between; padding: 16px 28px; border-top: 1px solid ${T.border}; font-size: 11px; color: ${T.text4}; }
  .footer .lhs { display: flex; align-items: center; gap: 7px; }
  .footer .dot { width: 6px; height: 6px; border-radius: 999px; background: ${T.teal}; box-shadow: 0 0 6px rgba(0,212,170,0.6); }
</style>
</head><body>
  <div class="doc">
    <div class="head">
      <div class="brand">
        ${brandMarkSVG()}
        <div><div class="wm">Athlits</div><div class="sub">Admin Console</div></div>
      </div>
      <div class="right">
        <div class="doctype">Invoice</div>
        <div class="num">#${escapeHTML(shortId)}</div>
        <div class="pill-wrap">${renderStatusPill(inv.status)}</div>
      </div>
    </div>
    <div class="accent-rule"></div>
    <div class="parties">${billedToHTML}${detailsHTML}</div>
    <div class="items-wrap">
      <table>
        <thead><tr><th>Description</th><th class="amt">Amount</th></tr></thead>
        <tbody>${itemsHTML}</tbody>
      </table>
    </div>
    ${invoiceStatusBanner(inv)}
    <div class="totals">
      <div class="box">
        <div class="row"><span>Subtotal</span><span style="font-family:${MONO_STACK};color:${T.text2}">${escapeHTML(fmtMoney(total, currency))}</span></div>
        <div class="grand"><span class="lbl">Amount due</span><span class="val">${escapeHTML(fmtMoney(total, currency))}</span></div>
        ${revenueNote}
      </div>
    </div>
    <div class="footer">
      <span class="lhs"><span class="dot"></span>Athlits Admin Dashboard</span>
      <span>Generated ${escapeHTML(generatedOn)}</span>
    </div>
  </div>
</body></html>`;

  openPrintDocument(html);
}

/** Trigger a browser download for an already-built Blob (e.g. a backend PDF). */
export function downloadBlob(blob: Blob, filename: string) {
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
