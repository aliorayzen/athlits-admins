"use client";

import { useRef } from "react";
import { Download, FileText, Printer, X } from "lucide-react";

import { downloadInvoiceTemplate } from "@/lib/export";
import type { InvoiceResponse, InvoiceStatus } from "@/types/api";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { InvoiceDocument } from "./invoice-document";

// Pill tone per status, matching the on-page StatusPill palette.
const STATUS_PILL: Record<InvoiceStatus, { label: string; cls: string }> = {
  GENERATED: {
    label: "Generated",
    cls: "border-[rgba(99,102,241,0.25)] bg-[rgba(99,102,241,0.1)] text-[var(--semantic-blue)]",
  },
  PAID: {
    label: "Paid",
    cls: "border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.1)] text-[var(--semantic-green)]",
  },
  OVERDUE: {
    label: "Overdue",
    cls: "border-[rgba(244,63,94,0.25)] bg-[rgba(244,63,94,0.1)] text-[var(--semantic-red)]",
  },
  VOID: {
    label: "Void",
    cls: "border-[var(--border)] bg-white/[0.04] text-[var(--text-4)]",
  },
};

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

interface InvoicePdfDialogProps {
  /** The invoice to preview; `null` keeps the dialog closed. */
  invoice: InvoiceResponse | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * In-app invoice viewer. Renders the live <InvoiceDocument /> — the same
 * template (`arena_scr_invoice_template.html`) reproduced from this invoice's
 * `InvoiceResponse` — so the preview always reflects the record shown in the
 * table (they stay in sync). "Print / Save PDF" prints exactly this document;
 * "Download PDF" opens the same template as a standalone, print-ready page
 * (→ "Save as PDF") so the saved file matches the preview and the source
 * template field-for-field.
 */
export function InvoicePdfDialog({
  invoice,
  onOpenChange,
}: InvoicePdfDialogProps) {
  const printCleanup = useRef<(() => void) | null>(null);

  function handlePrint() {
    // Tag <body> so the scoped @media print rules paint only .invoice-doc.
    // Cleared on afterprint (with a timeout fallback for browsers that skip it).
    const body = document.body;
    body.classList.add("printing-invoice-doc");

    const cleanup = () => {
      body.classList.remove("printing-invoice-doc");
      window.removeEventListener("afterprint", cleanup);
      if (printCleanup.current === cleanup) printCleanup.current = null;
    };
    printCleanup.current = cleanup;
    window.addEventListener("afterprint", cleanup);
    window.setTimeout(cleanup, 1000);

    window.print();
  }

  function handleDownload() {
    if (!invoice) return;
    downloadInvoiceTemplate(invoice);
  }

  const pill = invoice ? STATUS_PILL[invoice.status] : null;
  const venueName = invoice?.venueName ?? invoice?.venueId ?? "";
  const shortId = invoice ? invoice.id.slice(0, 8).toUpperCase() : "";

  return (
    <Dialog open={invoice !== null} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-label={invoice ? `Invoice ${shortId} preview` : undefined}
        className="flex h-[88vh] w-[min(960px,calc(100%-2rem))] max-w-[960px] flex-col gap-0 overflow-hidden border-[var(--border)] bg-[var(--bg-1)] p-0"
      >
        {invoice && (
          <>
            {/* ─── Themed header ─── */}
            <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[rgba(0,212,170,0.2)] bg-[linear-gradient(135deg,rgba(0,212,170,0.14),rgba(0,212,170,0.03))]">
                  <FileText className="h-[15px] w-[15px] text-[var(--teal-text)]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] font-semibold tracking-[-0.01em] text-[var(--text-1)]">
                      #{shortId}
                    </span>
                    {pill && (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-[2px] text-[10.5px] font-medium leading-[1.3]",
                          pill.cls,
                        )}
                      >
                        {pill.label}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[11.5px] text-[var(--text-3)]">
                    {venueName}
                    {" · "}
                    <span className="font-mono tabular-nums">
                      {formatAmount(invoice.amount, invoice.currencyCode)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <HeaderBtn
                  icon={Printer}
                  label="Print / Save PDF"
                  shortLabel="Print"
                  onClick={handlePrint}
                />
                <HeaderBtn
                  icon={Download}
                  label="Download PDF"
                  shortLabel="Download"
                  onClick={handleDownload}
                />
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Close preview"
                  className="ml-0.5 grid h-8 w-8 place-items-center rounded-md border border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-3)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-1)]"
                >
                  <X className="h-[15px] w-[15px]" />
                </button>
              </div>
            </header>

            {/* ─── Document surface ─── */}
            <div className="flex-1 overflow-auto bg-[var(--bg-0)] px-4 py-6 sm:px-8 sm:py-8">
              <div className="mx-auto w-full max-w-[860px]">
                <InvoiceDocument invoice={invoice} />
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function HeaderBtn({
  icon: Icon,
  label,
  shortLabel,
  onClick,
  disabled,
  spinning,
}: {
  icon: typeof Download;
  label: string;
  shortLabel: string;
  onClick: () => void;
  disabled?: boolean;
  spinning?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-2)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--text-2)] transition-all hover:border-[rgba(0,212,170,0.2)] hover:bg-[var(--teal-subtle)] hover:text-[var(--teal-text)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:bg-[var(--bg-2)] disabled:hover:text-[var(--text-2)]"
    >
      <Icon className={cn("h-[13px] w-[13px]", spinning && "animate-spin")} />
      <span className="hidden sm:inline">{shortLabel}</span>
    </button>
  );
}
