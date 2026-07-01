"use client";

import { useState } from "react";
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";

import { exportInvoices, getApiErrorMessage } from "@/lib/api";
import type { InvoiceExportFormat, InvoiceFilters } from "@/types/api";
import { downloadBlob } from "@/lib/export";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface InvoiceExportMenuProps {
  /** Count of rows in the current on-screen view (the themed client export). */
  viewCount: number;
  /** Active server filters, so "all matching" mirrors the table exactly. */
  serverFilters: InvoiceFilters;
  /** Themed client-side export of just the loaded rows. */
  onClientCsv: () => void;
  onClientPdf: () => void;
}

/**
 * Export picker. "This view" reuses the themed client-side CSV/PDF (only the
 * loaded page). "All matching" calls the backend /export endpoint, which spans
 * every invoice matching the current filters, not just the current page.
 */
export function InvoiceExportMenu({
  viewCount,
  serverFilters,
  onClientCsv,
  onClientPdf,
}: InvoiceExportMenuProps) {
  const [busy, setBusy] = useState<InvoiceExportFormat | null>(null);

  async function exportAll(format: InvoiceExportFormat) {
    setBusy(format);
    try {
      const blob = await exportInvoices(format, serverFilters);
      const date = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `invoices-${date}.${format}`);
      toast.success(`Exported all matching invoices (${format.toUpperCase()})`);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Export failed"));
    } finally {
      setBusy(null);
    }
  }

  const isBusy = busy !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(props) => (
          <button
            {...props}
            type="button"
            disabled={isBusy}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-1)] px-3 py-2 text-[13px] text-[var(--text-2)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)] disabled:opacity-60"
          >
            {isBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Export
            <ChevronDown className="h-3.5 w-3.5 text-[var(--text-4)]" />
          </button>
        )}
      />
      <DropdownMenuContent
        align="end"
        className="w-60 border-[var(--border)] bg-[var(--bg-1)]"
      >
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-[var(--text-4)]">
          This view · {viewCount}
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={onClientCsv}
          className="gap-2 text-[var(--text-2)]"
        >
          <FileSpreadsheet className="h-4 w-4 text-[var(--text-4)]" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onClientPdf}
          className="gap-2 text-[var(--text-2)]"
        >
          <FileText className="h-4 w-4 text-[var(--text-4)]" />
          PDF
          <span className="ml-auto text-[10px] text-[var(--text-4)]">
            themed
          </span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-[var(--border)]" />

        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-[var(--text-4)]">
          All matching filters
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => void exportAll("csv")}
          disabled={isBusy}
          className="gap-2 text-[var(--text-2)]"
        >
          <FileSpreadsheet className="h-4 w-4 text-[var(--text-4)]" />
          CSV
          {busy === "csv" && (
            <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void exportAll("pdf")}
          disabled={isBusy}
          className="gap-2 text-[var(--text-2)]"
        >
          <FileText className="h-4 w-4 text-[var(--text-4)]" />
          PDF
          {busy === "pdf" && (
            <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
