"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  X,
} from "lucide-react";

import { getApiErrorMessage, getInvoicePdf } from "@/lib/api";
import { downloadBlob } from "@/lib/export";
import type { InvoiceResponse, InvoiceStatus } from "@/types/api";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type LoadStatus = "loading" | "ready" | "error";

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
  /** The invoice whose backend PDF to preview; `null` keeps the dialog closed. */
  invoice: InvoiceResponse | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Themed in-app viewer for the backend-rendered invoice PDF. Fetches
 * `/api/admin/v1/invoices/{id}/pdf` as a Blob, renders it in an iframe wrapped
 * in Athlits chrome, and exposes Download / Print / Open-in-tab actions.
 */
export function InvoicePdfDialog({
  invoice,
  onOpenChange,
}: InvoicePdfDialogProps) {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [url, setUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [attempt, setAttempt] = useState(0);
  const blobRef = useRef<Blob | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  const invoiceId = invoice?.id ?? null;

  useEffect(() => {
    if (!invoiceId) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    // Nested async fn so the setState calls aren't flagged as synchronous in
    // the effect body (matches the dashboard's reload() pattern).
    async function loadPdf() {
      setStatus("loading");
      setErrorMsg("");
      setUrl(null);
      blobRef.current = null;
      try {
        const blob = await getInvoicePdf(invoiceId as string);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        blobRef.current = blob;
        setUrl(objectUrl);
        setStatus("ready");
      } catch (err: unknown) {
        if (cancelled) return;
        setErrorMsg(getApiErrorMessage(err, "Failed to load invoice PDF"));
        setStatus("error");
      }
    }
    void loadPdf();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [invoiceId, attempt]);

  function handleDownload() {
    if (blobRef.current && invoice) {
      downloadBlob(blobRef.current, `invoice-${invoice.id.slice(0, 8)}.pdf`);
    }
  }

  function handlePrint() {
    try {
      frameRef.current?.contentWindow?.focus();
      frameRef.current?.contentWindow?.print();
    } catch {
      // Some browsers block cross-frame print on the PDF viewer; fall back.
      if (url) window.open(url, "_blank");
    }
  }

  function handleOpenTab() {
    if (url) window.open(url, "_blank");
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
                  icon={Download}
                  label="Download"
                  onClick={handleDownload}
                  disabled={status !== "ready"}
                />
                <HeaderBtn
                  icon={Printer}
                  label="Print"
                  onClick={handlePrint}
                  disabled={status !== "ready"}
                />
                <HeaderBtn
                  icon={ExternalLink}
                  label="Open in tab"
                  onClick={handleOpenTab}
                  disabled={status !== "ready"}
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

            {/* ─── PDF surface ─── */}
            <div className="relative flex-1 bg-[var(--bg-0)]">
              {status === "loading" && (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="flex flex-col items-center gap-3 text-[var(--text-3)]">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--teal-text)]" />
                    <span className="text-[12.5px]">Loading invoice…</span>
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="absolute inset-0 grid place-items-center px-6">
                  <div className="flex max-w-sm flex-col items-center gap-3 text-center">
                    <div className="grid h-11 w-11 place-items-center rounded-full border border-[rgba(244,63,94,0.25)] bg-[rgba(244,63,94,0.1)]">
                      <AlertTriangle className="h-5 w-5 text-[var(--semantic-red)]" />
                    </div>
                    <p className="text-[13px] text-[var(--text-2)]">
                      {errorMsg}
                    </p>
                    <button
                      type="button"
                      onClick={() => setAttempt((a) => a + 1)}
                      className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-2)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-2)] transition-colors hover:border-[rgba(0,212,170,0.2)] hover:text-[var(--teal-text)]"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {status === "ready" && url && (
                <iframe
                  ref={frameRef}
                  src={url}
                  title={`Invoice ${shortId} PDF`}
                  className="h-full w-full border-0"
                />
              )}
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
  onClick,
  disabled,
}: {
  icon: typeof Download;
  label: string;
  onClick: () => void;
  disabled?: boolean;
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
      <Icon className="h-[13px] w-[13px]" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
