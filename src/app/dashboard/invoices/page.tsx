"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Mail,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

import {
  bulkMarkInvoicesPaid,
  bulkRemindInvoices,
  bulkVoidInvoices,
  getApiErrorMessage,
  getInvoiceKpis,
  getInvoices,
  markInvoicePaid,
  voidInvoice,
} from "@/lib/api";
import type {
  BulkInvoiceResult,
  InvoiceKpiSummary,
  InvoiceResponse,
  InvoiceStatus,
  PageResponse,
} from "@/types/api";
import { downloadCSV, downloadPDF } from "@/lib/export";
import { cn } from "@/lib/utils";
import { InvoicePdfDialog } from "./_components/invoice-pdf-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type StatusFilter = "all" | InvoiceStatus;

const STATUS_FILTERS: Array<{
  key: StatusFilter;
  label: string;
  dotClass: string;
}> = [
  { key: "all", label: "All", dotClass: "bg-[var(--text-4)]" },
  {
    key: "GENERATED",
    label: "Generated",
    dotClass: "iv2-chip-dot-blue",
  },
  { key: "PAID", label: "Paid", dotClass: "iv2-chip-dot-green" },
  { key: "OVERDUE", label: "Overdue", dotClass: "iv2-chip-dot-red" },
  { key: "VOID", label: "Void", dotClass: "bg-[var(--text-4)]" },
];

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatCurrencyNoSymbol(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPeriod(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const sameYear = s.getFullYear() === e.getFullYear();
  const startFmt = s.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endFmt = e.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startFmt} – ${endFmt}`;
}

function daysBetween(a: string, b: string): number {
  const A = new Date(a).getTime();
  const B = new Date(b).getTime();
  return Math.floor((A - B) / 86_400_000);
}

type Urgency = "overdue" | "due-soon" | "future" | "paid" | "void";

function computeUrgency(inv: InvoiceResponse): Urgency {
  if (inv.status === "VOID") return "void";
  if (inv.status === "PAID") return "paid";
  const daysUntilDue = daysBetween(inv.dueDate, new Date().toISOString());
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= 3) return "due-soon";
  return "future";
}

type Phase = "loading" | "error" | "ready";
const INVOICE_PAGE_SIZE = 20;

// Surface partial-success outcomes from a bulk operation as a single toast.
function reportBulkResult(result: BulkInvoiceResult, verbPast: string): void {
  const ok = result.succeeded.length;
  const failed = result.failed.length;
  if (ok > 0 && failed === 0) {
    toast.success(`${ok} ${ok === 1 ? "invoice" : "invoices"} ${verbPast}`);
  } else if (ok > 0) {
    toast.warning(`${ok} ${verbPast}, ${failed} failed`);
  } else {
    toast.error(`No invoices ${verbPast} — ${failed} failed`);
  }
}

function parseStatusFilter(value: string | null): StatusFilter {
  return value === "GENERATED" ||
    value === "PAID" ||
    value === "OVERDUE" ||
    value === "VOID"
    ? value
    : "all";
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<InvoicesRouteFallback />}>
      <InvoicesContent />
    </Suspense>
  );
}

function InvoicesRouteFallback() {
  return (
    <div className="invoices-v2 space-y-5">
      <InvoicesSkeleton />
    </div>
  );
}

function InvoicesContent() {
  const searchParams = useSearchParams();
  const urlVenueName = searchParams.get("venueName")?.trim() ?? "";
  const urlStatusFilter = parseStatusFilter(searchParams.get("status"));

  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [pageData, setPageData] =
    useState<PageResponse<InvoiceResponse> | null>(null);
  const [kpis, setKpis] = useState<InvoiceKpiSummary | null>(null);
  const [kpisLoading, setKpisLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState(urlVenueName);
  const [debouncedSearch, setDebouncedSearch] = useState(urlVenueName);
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>(urlStatusFilter);
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPaidOpen, setBulkPaidOpen] = useState(false);
  const [bulkPaidRef, setBulkPaidRef] = useState("");
  const [bulkVoidOpen, setBulkVoidOpen] = useState(false);
  const [bulkVoidReason, setBulkVoidReason] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [pdfInvoice, setPdfInvoice] = useState<InvoiceResponse | null>(null);
  const bulkPaidRefId = useId();
  const bulkVoidReasonId = useId();

  const isLoading = phase === "loading";
  const isKpiLoading = kpisLoading && kpis === null;
  const kpiCurrency = kpis?.currencyCode ?? "USD";

  const loadKpis = useCallback(async () => {
    setKpisLoading(true);
    try {
      setKpis(await getInvoiceKpis());
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to load invoice KPIs"));
    } finally {
      setKpisLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    setPhase("loading");
    setErrorMessage("");
    try {
      const query = debouncedSearch.trim();
      const pageResp = await getInvoices({
        page,
        size: INVOICE_PAGE_SIZE,
        venueNameEn: query || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      });

      const real = pageResp.content ?? [];

      setInvoices(real);
      setPageData(pageResp);
      setPhase("ready");
    } catch (err: unknown) {
      setErrorMessage(getApiErrorMessage(err));
      setPhase("error");
    }
  }, [debouncedSearch, page, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setSearch(urlVenueName);
    setDebouncedSearch(urlVenueName);
    setStatusFilter(urlStatusFilter);
    setPage(0);
    setSelectedIds(new Set());
  }, [urlVenueName, urlStatusFilter]);

  useEffect(() => {
    // Wrapped in a local async function so the setState calls inside `reload`
    // aren't flagged as synchronous-in-effect (matches the dashboard pattern).
    async function run() {
      await reload();
    }
    void run();
  }, [reload]);

  useEffect(() => {
    void loadKpis();
  }, [loadKpis]);

  /* ─── KPIs ─── */
  const kpiValues = {
    outstandingAmount: kpis?.outstandingAmount ?? 0,
    outstandingCount: kpis?.outstandingCount ?? 0,
    collectedMtdAmount: kpis?.collectedMtdAmount ?? 0,
    overdueAmount: kpis?.overdueAmount ?? 0,
    overdueCount: kpis?.overdueCount ?? 0,
    avgCollectionDays: kpis?.avgCollectionDays ?? null,
  };

  /* ─── Aging buckets (only for OVERDUE invoices) ─── */
  const aging = useMemo(() => {
    const buckets: Record<
      "b1" | "b2" | "b3" | "b4",
      { count: number; amount: number }
    > = {
      b1: { count: 0, amount: 0 }, // 1-30
      b2: { count: 0, amount: 0 }, // 31-60
      b3: { count: 0, amount: 0 }, // 61-90
      b4: { count: 0, amount: 0 }, // 90+
    };
    invoices
      .filter((i) => i.status === "OVERDUE")
      .forEach((inv) => {
        const days = daysBetween(new Date().toISOString(), inv.dueDate);
        const b =
          days <= 30 ? "b1" : days <= 60 ? "b2" : days <= 90 ? "b3" : "b4";
        buckets[b].count += 1;
        buckets[b].amount += inv.amount;
      });
    const maxAmount = Math.max(
      buckets.b1.amount,
      buckets.b2.amount,
      buckets.b3.amount,
      buckets.b4.amount,
      1,
    );
    const count =
      buckets.b1.count + buckets.b2.count + buckets.b3.count + buckets.b4.count;
    return { buckets, maxAmount, count };
  }, [invoices]);

  const statusCounts = useMemo(
    () => ({
      all:
        statusFilter === "all"
          ? (pageData?.totalElements ?? invoices.length)
          : invoices.length,
      GENERATED: invoices.filter((i) => i.status === "GENERATED").length,
      PAID: invoices.filter((i) => i.status === "PAID").length,
      OVERDUE: invoices.filter((i) => i.status === "OVERDUE").length,
      VOID: invoices.filter((i) => i.status === "VOID").length,
    }),
    [invoices, pageData?.totalElements, statusFilter],
  );

  const filtered = useMemo(() => {
    // Sort: overdue first (oldest due date first), then generated (earliest due),
    // then paid (most recent paidAt), then void
    return [...invoices].sort((a, b) => {
      const order = { OVERDUE: 0, GENERATED: 1, PAID: 2, VOID: 3 };
      if (a.status !== b.status) return order[a.status] - order[b.status];
      if (a.status === "PAID") {
        return (
          new Date(b.paidAt ?? b.createdAt).getTime() -
          new Date(a.paidAt ?? a.createdAt).getTime()
        );
      }
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [invoices]);

  const selectedInvoices = useMemo(
    () => filtered.filter((i) => selectedIds.has(i.id)),
    [filtered, selectedIds],
  );

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id));
  const someVisibleSelected =
    filtered.some((i) => selectedIds.has(i.id)) && !allVisibleSelected;

  const selectedTotal = useMemo(
    () => selectedInvoices.reduce((sum, i) => sum + i.amount, 0),
    [selectedInvoices],
  );

  /* ─── Bulk select handlers ─── */
  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        filtered.forEach((i) => next.delete(i.id));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach((i) => next.add(i.id));
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function updateSearch(value: string) {
    setSearch(value);
    setPage(0);
    setSelectedIds(new Set());
  }

  function updateStatusFilter(value: StatusFilter) {
    setStatusFilter(value);
    setPage(0);
    setSelectedIds(new Set());
  }

  /* ─── Void handler ─── */
  async function handleVoid(id: string) {
    try {
      await voidInvoice(id);
      toast.success("Invoice voided");
      await reload();
      await loadKpis();
    } catch {
      toast.error("Failed to void invoice");
    }
  }

  /* ─── Bulk handlers (partial success supported) ─── */
  async function handleBulkMarkPaid() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const result = await bulkMarkInvoicesPaid(ids, bulkPaidRef.trim());
      reportBulkResult(result, "marked paid");
      setBulkPaidOpen(false);
      setBulkPaidRef("");
      clearSelection();
      await reload();
      await loadKpis();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to mark invoices paid"));
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBulkVoid() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const result = await bulkVoidInvoices(ids, bulkVoidReason.trim());
      reportBulkResult(result, "voided");
      setBulkVoidOpen(false);
      setBulkVoidReason("");
      clearSelection();
      await reload();
      await loadKpis();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to void invoices"));
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBulkRemind() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const result = await bulkRemindInvoices(ids);
      reportBulkResult(result, "reminded");
      clearSelection();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to send reminders"));
    } finally {
      setBulkBusy(false);
    }
  }

  /* ─── Export helpers ─── */
  const exportCSV = useCallback((list: InvoiceResponse[], suffix: string) => {
    const headers = [
      "Invoice",
      "Venue",
      "Period",
      "Amount",
      "Currency",
      "Status",
      "Due Date",
      "Paid At",
    ];
    const rows = list.map((inv) => [
      inv.id.slice(0, 8),
      inv.venueName ?? inv.venueId,
      formatPeriod(inv.periodStart, inv.periodEnd),
      inv.amount,
      inv.currencyCode,
      inv.status,
      formatDate(inv.dueDate),
      inv.paidAt ? formatDate(inv.paidAt) : "",
    ]);
    downloadCSV(
      `invoices-${suffix}-${new Date().toISOString().slice(0, 10)}`,
      headers,
      rows,
    );
    toast.success(
      `Exported ${list.length} ${list.length === 1 ? "invoice" : "invoices"}`,
    );
  }, []);

  const exportPDF = useCallback(
    (list: InvoiceResponse[], suffix: string) => {
      const headers = [
        "Invoice",
        "Venue",
        "Period",
        "Amount",
        "Status",
        "Due Date",
      ];
      const rows = list.map((inv) => [
        `#${inv.id.slice(0, 8)}`,
        inv.venueName ?? inv.venueId,
        formatPeriod(inv.periodStart, inv.periodEnd),
        formatCurrency(inv.amount, inv.currencyCode),
        inv.status,
        formatDate(inv.dueDate),
      ]);
      const totalValue = list
        .filter((i) => i.status !== "VOID")
        .reduce((sum, i) => sum + i.amount, 0);
      downloadPDF(
        "Athlits Invoices Report",
        `invoices-${suffix}`,
        headers,
        rows,
        [
          {
            label: "Filter",
            value: suffix === "filtered" ? statusFilter : suffix,
          },
          { label: "Total Records", value: String(list.length) },
          {
            label: "Total Value",
            value:
              list.length > 0 ? formatCurrency(totalValue, kpiCurrency) : "—",
          },
        ],
      );
    },
    [statusFilter, kpiCurrency],
  );

  /* ─── Chip sliding indicator ─── */
  const chipRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    transform: string;
    width: number;
    opacity: number;
  }>({ transform: "translateX(0px)", width: 0, opacity: 0 });

  useEffect(() => {
    const idx = STATUS_FILTERS.findIndex((f) => f.key === statusFilter);
    const el = chipRefs.current[idx];
    if (!el) return;
    setIndicatorStyle({
      transform: `translateX(${el.offsetLeft - 2}px)`,
      width: el.offsetWidth,
      opacity: 1,
    });
  }, [statusFilter, invoices.length]);

  return (
    <div className="invoices-v2 space-y-5">
      {/* ═══════════ Header ═══════════ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-1)]">
              Invoices
            </h1>
            {phase === "ready" && (
              <span className="iv2-count-pill inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-1)] px-2 py-[2px] font-mono text-[11px] font-medium tabular-nums text-[var(--text-3)]">
                {pageData?.totalElements ?? invoices.length}
              </span>
            )}
          </div>
          <p className="text-[13px] tracking-[-0.003em] text-[var(--text-3)]">
            Billing, payments, and collection tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          {phase === "ready" && kpiValues.overdueCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[rgba(244,63,94,0.22)] bg-[rgba(244,63,94,0.1)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--semantic-red)]">
              <span className="iv2-urgency-pulse h-1.5 w-1.5 rounded-full bg-[var(--semantic-red)] shadow-[0_0_6px_var(--semantic-red)]" />
              <AlertTriangle className="h-3 w-3" />
              {kpiValues.overdueCount} overdue
            </span>
          )}
          {filtered.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={() => exportCSV(filtered, "filtered")}
                className="gap-1.5 border-[var(--border)] bg-[var(--bg-1)] text-[13px] text-[var(--text-2)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]"
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => exportPDF(filtered, "filtered")}
                className="gap-1.5 border-[var(--border)] bg-[var(--bg-1)] text-[13px] text-[var(--text-2)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]"
              >
                <Printer className="h-3.5 w-3.5" />
                PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ═══════════ KPI strip ═══════════ */}
      {phase !== "error" && (
        <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.01)_0%,transparent_50%),var(--bg-1)] sm:grid-cols-4">
          <KpiCell
            hero
            label="Outstanding balance"
            dotClass="bg-[var(--teal)] iv2-dot-teal"
            value={
              isKpiLoading
                ? "—"
                : formatCurrencyNoSymbol(kpiValues.outstandingAmount).split(
                    ".",
                  )[0]
            }
            cents={
              isKpiLoading
                ? null
                : `.${formatCurrencyNoSymbol(kpiValues.outstandingAmount).split(".")[1]}`
            }
            currency={kpiCurrency}
            sub={
              isKpiLoading
                ? null
                : kpiValues.outstandingCount > 0
                  ? `Across ${kpiValues.outstandingCount} unpaid ${kpiValues.outstandingCount === 1 ? "invoice" : "invoices"}`
                  : "Nothing unpaid"
            }
            borderLeft={false}
          />
          <KpiCell
            label="Collected (MTD)"
            dotClass="bg-[var(--semantic-green)] iv2-dot-ok"
            valueToneClass="text-[var(--semantic-green)]"
            value={
              isKpiLoading
                ? "—"
                : formatCurrencyNoSymbol(kpiValues.collectedMtdAmount).split(
                    ".",
                  )[0]
            }
            cents={
              isKpiLoading
                ? null
                : `.${formatCurrencyNoSymbol(kpiValues.collectedMtdAmount).split(".")[1]}`
            }
            currency={kpiCurrency}
            sub={isKpiLoading ? null : "This month"}
            borderLeft
          />
          <KpiCell
            label="Overdue"
            dotClass="bg-[var(--semantic-red)] iv2-dot-alert"
            valueToneClass="text-[var(--semantic-red)]"
            value={
              isKpiLoading
                ? "—"
                : formatCurrencyNoSymbol(kpiValues.overdueAmount).split(".")[0]
            }
            cents={
              isKpiLoading || kpiValues.overdueAmount === 0
                ? null
                : `.${formatCurrencyNoSymbol(kpiValues.overdueAmount).split(".")[1]}`
            }
            currency={kpiCurrency}
            sub={
              isKpiLoading
                ? null
                : kpiValues.overdueCount > 0
                  ? `${kpiValues.overdueCount} ${kpiValues.overdueCount === 1 ? "invoice" : "invoices"} — needs collection`
                  : "All clear"
            }
            borderLeft
          />
          <KpiCell
            label="Avg collection time"
            dotClass="bg-[var(--text-4)]"
            value={
              isKpiLoading
                ? "—"
                : kpiValues.avgCollectionDays !== null
                  ? kpiValues.avgCollectionDays.toFixed(1)
                  : "—"
            }
            valueSuffix={
              kpiValues.avgCollectionDays !== null && !isKpiLoading ? (
                <span className="text-[14px] font-medium text-[var(--text-4)]">
                  {" "}
                  days
                </span>
              ) : null
            }
            sub={
              isKpiLoading
                ? null
                : kpiValues.avgCollectionDays !== null
                  ? "Across paid invoices"
                  : "No paid invoices yet"
            }
            borderLeft
          />
        </div>
      )}

      {/* ═══════════ Aging breakdown (only if overdue > 0) ═══════════ */}
      {!isLoading && aging.count > 0 && (
        <div className="grid grid-cols-[auto_repeat(4,minmax(0,1fr))] gap-4 rounded-lg border border-[rgba(244,63,94,0.12)] bg-[linear-gradient(180deg,rgba(244,63,94,0.04),rgba(244,63,94,0.01))] px-5 py-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--semantic-red)]">
            <AlertTriangle className="h-3 w-3" />
            Aging
          </div>
          <AgingBucket
            label="1-30 days"
            count={aging.buckets.b1.count}
            amount={aging.buckets.b1.amount}
            maxAmount={aging.maxAmount}
            currency={kpiCurrency}
            tone="amber"
          />
          <AgingBucket
            label="31-60 days"
            count={aging.buckets.b2.count}
            amount={aging.buckets.b2.amount}
            maxAmount={aging.maxAmount}
            currency={kpiCurrency}
            tone="orange"
          />
          <AgingBucket
            label="61-90 days"
            count={aging.buckets.b3.count}
            amount={aging.buckets.b3.amount}
            maxAmount={aging.maxAmount}
            currency={kpiCurrency}
            tone="red"
          />
          <AgingBucket
            label="90+ days"
            count={aging.buckets.b4.count}
            amount={aging.buckets.b4.amount}
            maxAmount={aging.maxAmount}
            currency={kpiCurrency}
            tone="crimson"
          />
        </div>
      )}

      {/* ═══════════ Bulk selection bar ═══════════ */}
      {selectedIds.size > 0 && (
        <div className="iv2-bulk-bar flex items-center justify-between gap-4 rounded-md border border-[rgba(0,212,170,0.18)] bg-[linear-gradient(180deg,rgba(0,212,170,0.08),rgba(0,212,170,0.02)),var(--bg-1)] px-3.5 py-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--teal-subtle)] px-2.5 py-[3px] font-mono text-[11px] font-semibold text-[var(--teal-text)]">
              {selectedIds.size} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-[12px] font-medium text-[var(--text-3)] transition-colors hover:text-[var(--text-1)]"
              type="button"
            >
              Clear
            </button>
            <span className="text-[12px] text-[var(--text-3)]">
              <span className="font-mono font-medium tabular-nums text-[var(--text-2)]">
                {formatCurrency(selectedTotal, kpiCurrency)}
              </span>{" "}
              total
            </span>
          </div>
          <div className="flex gap-1.5">
            <BulkBtn
              variant="success"
              onClick={() => setBulkPaidOpen(true)}
              title="Mark selected as paid"
            >
              <CheckCircle className="h-3 w-3" />
              Mark paid
            </BulkBtn>
            <BulkBtn
              onClick={() => void handleBulkRemind()}
              title="Send payment reminder"
            >
              <Mail className="h-3 w-3" />
              Remind
            </BulkBtn>
            <BulkBtn
              onClick={() => exportCSV(selectedInvoices, "selected")}
              title="Export selected as CSV"
            >
              <Download className="h-3 w-3" />
              Export
            </BulkBtn>
            <BulkBtn
              variant="danger"
              onClick={() => setBulkVoidOpen(true)}
              title="Void selected"
            >
              <XCircle className="h-3 w-3" />
              Void
            </BulkBtn>
          </div>
        </div>
      )}

      {/* ═══════════ Filter bar ═══════════ */}
      {phase === "ready" && (
        <div className="flex items-center justify-between gap-3">
          <div className="relative inline-flex items-center gap-[2px] rounded-md border border-[var(--border)] bg-[var(--bg-1)] p-[2px]">
            <span
              className="iv2-chip-indicator"
              style={{
                transform: indicatorStyle.transform,
                width: indicatorStyle.width,
                opacity: indicatorStyle.opacity,
              }}
              aria-hidden="true"
            />
            {STATUS_FILTERS.map((filter, i) => (
              <button
                key={filter.key}
                ref={(el) => {
                  chipRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                aria-selected={statusFilter === filter.key}
                onClick={() => updateStatusFilter(filter.key)}
                className={cn(
                  "relative z-10 inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                  statusFilter === filter.key
                    ? "text-[var(--text-1)]"
                    : "text-[var(--text-3)] hover:text-[var(--text-1)]",
                )}
              >
                <span
                  className={cn(
                    "h-[5px] w-[5px] rounded-full",
                    filter.dotClass,
                  )}
                />
                {filter.label}
                <span className="pl-0.5 font-mono text-[10.5px] tabular-nums text-[var(--text-4)]">
                  {statusCounts[filter.key]}
                </span>
              </button>
            ))}
          </div>
          <div className="relative w-full max-w-[320px]">
            <Search className="pointer-events-none absolute left-[11px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[var(--text-4)]" />
            <input
              type="search"
              placeholder="Search venue name"
              value={search}
              onChange={(e) => updateSearch(e.target.value)}
              className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--bg-1)] pl-[34px] pr-11 text-[12.5px] text-[var(--text-1)] outline-none transition-all placeholder:text-[var(--text-4)] focus:border-[var(--teal)] focus:shadow-[0_0_0_3px_var(--teal-subtle)]"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-[var(--border)] bg-[var(--bg-2)] px-1.5 py-px font-mono text-[10px] text-[var(--text-4)] opacity-70">
              /
            </span>
          </div>
        </div>
      )}

      {/* ═══════════ Table ═══════════ */}
      {phase === "error" ? (
        <ErrorState message={errorMessage} onRetry={() => void reload()} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)]">
          {isLoading ? (
            <InvoicesSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState
              hasInvoices={
                Boolean(search.trim() || statusFilter !== "all") ||
                (pageData?.totalElements ?? invoices.length) > 0
              }
              activeFilter={statusFilter}
              onClearFilters={() => {
                setSearch("");
                setDebouncedSearch("");
                updateStatusFilter("all");
              }}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-0">
                  <thead className="bg-white/[0.012]">
                    <tr>
                      <Th className="w-10 pl-4 pr-0">
                        <Checkbox
                          checked={allVisibleSelected}
                          indeterminate={someVisibleSelected}
                          onChange={toggleAllVisible}
                          ariaLabel="Select all"
                        />
                      </Th>
                      <Th>Invoice</Th>
                      <Th>Venue</Th>
                      <Th>Period</Th>
                      <Th>Amount</Th>
                      <Th>Status</Th>
                      <Th>Due</Th>
                      <Th className="text-right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((inv) => (
                      <InvoiceRow
                        key={inv.id}
                        invoice={inv}
                        isSelected={selectedIds.has(inv.id)}
                        onToggle={() => toggleRow(inv.id)}
                        onVoid={() => handleVoid(inv.id)}
                        onPaid={() => {
                          void reload();
                          void loadKpis();
                        }}
                        onPdf={() => setPdfInvoice(inv)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <InvoicesPagination
                pageData={pageData}
                page={page}
                isFetching={isLoading}
                selectedCount={selectedIds.size}
                outstanding={kpiValues.outstandingAmount}
                currency={kpiCurrency}
                onPageChange={(next) => {
                  setPage(next);
                  setSelectedIds(new Set());
                }}
              />
            </>
          )}
        </div>
      )}

      {/* ═══════════ Bulk: mark paid ═══════════ */}
      <Dialog open={bulkPaidOpen} onOpenChange={setBulkPaidOpen}>
        <DialogContent className="border-[var(--border)] bg-[var(--bg-1)]">
          <DialogHeader>
            <DialogTitle>
              Mark {selectedIds.size}{" "}
              {selectedIds.size === 1 ? "invoice" : "invoices"} as paid
            </DialogTitle>
            <DialogDescription className="text-[var(--text-3)]">
              Records the same payment reference against every selected invoice.
              Already-settled invoices are skipped.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label
              htmlFor={bulkPaidRefId}
              className="text-xs font-medium uppercase tracking-wider text-[var(--text-3)]"
            >
              Payment Reference
            </Label>
            <Input
              id={bulkPaidRefId}
              value={bulkPaidRef}
              onChange={(e) => setBulkPaidRef(e.target.value)}
              placeholder="e.g. batch transfer ref"
              className="border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-1)] placeholder:text-[var(--text-4)] focus:border-[var(--teal)] focus:ring-[3px] focus:ring-[var(--teal-subtle)]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkPaidOpen(false)}
              className="border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-2)]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleBulkMarkPaid()}
              disabled={!bulkPaidRef.trim() || bulkBusy}
              className="gap-2 bg-[linear-gradient(135deg,var(--semantic-green)_0%,#059669_100%)] font-medium text-white shadow-[0_0_20px_-4px_rgba(16,185,129,0.35)] hover:brightness-110"
            >
              {bulkBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ Bulk: void ═══════════ */}
      <AlertDialog open={bulkVoidOpen} onOpenChange={setBulkVoidOpen}>
        <AlertDialogContent className="border-[var(--border)] bg-[var(--bg-1)]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Void {selectedIds.size}{" "}
              {selectedIds.size === 1 ? "invoice" : "invoices"}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--text-3)]">
              This cannot be undone. Paid invoices are skipped. You can record
              an optional reason for the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-1">
            <Label
              htmlFor={bulkVoidReasonId}
              className="text-xs font-medium uppercase tracking-wider text-[var(--text-3)]"
            >
              Reason (optional)
            </Label>
            <Input
              id={bulkVoidReasonId}
              value={bulkVoidReason}
              onChange={(e) => setBulkVoidReason(e.target.value)}
              placeholder="e.g. duplicate invoices"
              className="border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-1)] placeholder:text-[var(--text-4)] focus:border-[var(--teal)] focus:ring-[3px] focus:ring-[var(--teal-subtle)]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-2)]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleBulkVoid();
              }}
              disabled={bulkBusy}
              className="bg-[var(--semantic-red-subtle)] text-[var(--semantic-red)] hover:bg-[var(--semantic-red-subtle)] hover:brightness-125"
            >
              {bulkBusy ? "Voiding…" : "Void Invoices"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════ Invoice PDF viewer ═══════════ */}
      <InvoicePdfDialog
        invoice={pdfInvoice}
        onOpenChange={(open) => {
          if (!open) setPdfInvoice(null);
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Sub-components
   ─────────────────────────────────────────────────────────────── */

function invoicePageWindow(
  current: number,
  total: number,
): Array<number | "..."> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages = new Set<number>([0, total - 1, current]);
  if (current > 0) pages.add(current - 1);
  if (current + 1 < total) pages.add(current + 1);
  if (current <= 2) {
    pages.add(1);
    pages.add(2);
  }
  if (current >= total - 3) {
    pages.add(total - 2);
    pages.add(total - 3);
  }
  const sorted = [...pages]
    .filter((p) => p >= 0 && p < total)
    .sort((a, b) => a - b);
  const result: Array<number | "..."> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push("...");
    result.push(p);
  });
  return result;
}

function InvoicesPagination({
  pageData,
  page,
  isFetching,
  selectedCount,
  outstanding,
  currency,
  onPageChange,
}: {
  pageData: PageResponse<InvoiceResponse> | null;
  page: number;
  isFetching: boolean;
  selectedCount: number;
  outstanding: number;
  currency: string;
  onPageChange: (page: number) => void;
}) {
  const pageIndex = pageData?.number ?? page;
  const total = pageData?.totalElements ?? 0;
  const totalPages = Math.max(1, pageData?.totalPages ?? 1);
  const size = pageData?.size ?? INVOICE_PAGE_SIZE;
  const onPage = pageData?.numberOfElements ?? pageData?.content.length ?? 0;
  const start = total === 0 ? 0 : pageIndex * size + 1;
  const end = total === 0 ? 0 : Math.min(total, pageIndex * size + onPage);
  const isFirst = pageData?.first ?? pageIndex === 0;
  const isLast = pageData?.last ?? pageIndex + 1 >= totalPages;

  return (
    <div className="flex flex-col gap-2 border-t border-[var(--border)] bg-white/[0.008] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="font-mono text-[12px] tabular-nums text-[var(--text-4)]">
        {total === 0 ? "No results" : `Showing ${start}-${end} of ${total}`}
        {outstanding > 0 && (
          <span className="ml-3 text-[var(--teal-text)]">
            Outstanding: {formatCurrency(outstanding, currency)}
          </span>
        )}
        {selectedCount > 0 && (
          <span className="ml-3 text-[var(--teal-text)]">
            {selectedCount} selected
          </span>
        )}
      </span>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <InvoicePageButton
            disabled={isFirst || isFetching}
            onClick={() => onPageChange(pageIndex - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-[14px] w-[14px]" />
          </InvoicePageButton>

          {invoicePageWindow(pageIndex, totalPages).map((p, i) =>
            p === "..." ? (
              <span
                key={`gap-${i}`}
                className="px-1 font-mono text-[12px] text-[var(--text-4)]"
              >
                ...
              </span>
            ) : (
              <InvoicePageButton
                key={p}
                active={p === pageIndex}
                disabled={isFetching}
                onClick={() => onPageChange(p)}
                aria-label={`Page ${p + 1}`}
                aria-current={p === pageIndex ? "page" : undefined}
              >
                {p + 1}
              </InvoicePageButton>
            ),
          )}

          <InvoicePageButton
            disabled={isLast || isFetching}
            onClick={() => onPageChange(pageIndex + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-[14px] w-[14px]" />
          </InvoicePageButton>
        </div>
      )}
    </div>
  );
}

function InvoicePageButton({
  children,
  active,
  disabled,
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
} & React.AriaAttributes) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      {...rest}
      className={cn(
        "grid h-7 min-w-7 place-items-center rounded-md border px-1.5 font-mono text-[12px] tabular-nums transition-all disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "border-[rgba(0,212,170,0.3)] bg-[rgba(0,212,170,0.1)] text-[var(--teal-text)]"
          : "border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-3)] hover:border-[var(--border-strong)] hover:text-[var(--text-1)]",
      )}
    >
      {children}
    </button>
  );
}

interface KpiCellProps {
  hero?: boolean;
  label: string;
  value: string;
  cents?: string | null;
  currency?: string;
  valueToneClass?: string;
  valueSuffix?: React.ReactNode;
  dotClass: string;
  sub: string | null;
  borderLeft: boolean;
}

function KpiCell({
  hero,
  label,
  value,
  cents,
  currency,
  valueToneClass,
  valueSuffix,
  dotClass,
  sub,
  borderLeft,
}: KpiCellProps) {
  return (
    <div
      className={cn(
        "iv2-kpi relative px-5 py-4",
        hero && "iv2-kpi-hero",
        borderLeft &&
          "before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-px before:bg-[var(--border)]",
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
        <span className={cn("h-[5px] w-[5px] rounded-full", dotClass)} />
        {label}
      </div>
      <div
        className={cn(
          "mt-2 flex items-baseline gap-1 text-[26px] font-bold leading-none tracking-[-0.035em] tabular-nums",
          valueToneClass ?? "text-[var(--text-1)]",
        )}
      >
        {currency && (
          <span className="text-[12px] font-medium tracking-normal text-[var(--text-3)]">
            {currency}
          </span>
        )}
        <span>{value}</span>
        {cents && (
          <span className="text-[14px] font-medium text-[var(--text-4)]">
            {cents}
          </span>
        )}
        {valueSuffix}
      </div>
      {sub && (
        <div className="mt-1.5 text-[11px] text-[var(--text-3)]">{sub}</div>
      )}
    </div>
  );
}

function AgingBucket({
  label,
  count,
  amount,
  maxAmount,
  currency,
  tone,
}: {
  label: string;
  count: number;
  amount: number;
  maxAmount: number;
  currency: string;
  tone: "amber" | "orange" | "red" | "crimson";
}) {
  const percent = maxAmount > 0 ? Math.max(0, (amount / maxAmount) * 100) : 0;
  const toneMap = {
    amber: {
      text: "text-[var(--semantic-amber)]",
      bg: "bg-[var(--semantic-amber)]",
    },
    orange: { text: "text-[#fb923c]", bg: "bg-[#fb923c]" },
    red: { text: "text-[var(--semantic-red)]", bg: "bg-[var(--semantic-red)]" },
    crimson: { text: "text-[#be123c]", bg: "bg-[#be123c]" },
  } as const;
  const t = toneMap[tone];
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[9.5px] font-medium uppercase tracking-[0.05em] text-[var(--text-4)]">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={cn("text-[15px] font-bold tabular-nums", t.text)}>
          {count}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-[var(--text-3)]">
          {count > 0 ? formatCurrency(amount, currency) : "—"}
        </span>
      </div>
      <div className="mt-0.5 h-[3px] overflow-hidden rounded-sm bg-white/[0.04]">
        <span
          className={cn("iv2-aging-bar-fill", t.bg)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function BulkBtn({
  children,
  onClick,
  title,
  variant = "neutral",
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  variant?: "neutral" | "success" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded border border-[var(--border-strong)] bg-[var(--bg-2)] px-2.5 py-[5px] text-[12px] font-medium text-[var(--text-2)] transition-all",
        variant === "success" &&
          "hover:border-[rgba(16,185,129,0.3)] hover:bg-[rgba(16,185,129,0.08)] hover:text-[var(--semantic-green)] hover:shadow-[0_4px_14px_-6px_rgba(16,185,129,0.4)]",
        variant === "danger" &&
          "hover:border-[rgba(244,63,94,0.3)] hover:bg-[var(--semantic-red-subtle)] hover:text-[var(--semantic-red)]",
        variant === "neutral" &&
          "hover:border-[rgba(0,212,170,0.18)] hover:bg-[var(--teal-subtle)] hover:text-[var(--teal-text)]",
      )}
    >
      {children}
    </button>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "border-b border-[var(--border)] px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)] whitespace-nowrap select-none",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Checkbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  const state = indeterminate ? "indeterminate" : checked ? "checked" : "idle";
  return (
    <button
      type="button"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      role="checkbox"
      onClick={onChange}
      className={cn(
        "iv2-checkbox relative block h-[14px] w-[14px] rounded-[3px] border-[1.3px] transition-all",
        state === "idle" &&
          "border-[var(--border-strong)] bg-transparent hover:border-[var(--teal)]",
        state === "checked" && "border-[var(--teal)] bg-[var(--teal)]",
        state === "indeterminate" && "border-[var(--teal)] bg-[var(--teal)]",
      )}
    >
      {state === "checked" && (
        <span
          aria-hidden="true"
          className="absolute left-[3px] top-0 h-2 w-1 rotate-45 border-b-[1.5px] border-r-[1.5px] border-[#032921]"
        />
      )}
      {state === "indeterminate" && (
        <span
          aria-hidden="true"
          className="absolute left-[2px] right-[2px] top-1/2 h-[1.5px] -translate-y-1/2 bg-[#032921]"
        />
      )}
    </button>
  );
}

function hashGradient(id: string): "g1" | "g2" | "g3" | "g4" {
  const sum = [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const variants = ["g1", "g2", "g3", "g4"] as const;
  return variants[sum % variants.length];
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase() || "V";
}

function InvoiceRow({
  invoice,
  isSelected,
  onToggle,
  onVoid,
  onPaid,
  onPdf,
}: {
  invoice: InvoiceResponse;
  isSelected: boolean;
  onToggle: () => void;
  onVoid: () => void;
  onPaid: () => void;
  onPdf: () => void;
}) {
  const urgency = computeUrgency(invoice);
  const venueName = invoice.venueName ?? invoice.venueId;
  const gradientKey = hashGradient(invoice.venueId);

  const gradientClass = {
    g1: "bg-[linear-gradient(135deg,rgba(0,212,170,0.25)_0%,rgba(0,212,170,0.06)_100%)] text-[var(--teal-text)]",
    g2: "bg-[linear-gradient(135deg,rgba(99,102,241,0.22)_0%,rgba(99,102,241,0.04)_100%)] text-[#a5b4fc]",
    g3: "bg-[linear-gradient(135deg,rgba(245,158,11,0.2)_0%,rgba(245,158,11,0.04)_100%)] text-[#fcd34d]",
    g4: "bg-[linear-gradient(135deg,rgba(244,63,94,0.2)_0%,rgba(244,63,94,0.04)_100%)] text-[#fda4af]",
  }[gradientKey];

  return (
    <tr
      className={cn(
        "iv2-tr group transition-colors",
        urgency === "overdue" && "iv2-tr-overdue",
        urgency === "due-soon" && "iv2-tr-due-soon",
        isSelected
          ? "bg-[rgba(0,212,170,0.04)] hover:bg-[rgba(0,212,170,0.055)]"
          : "hover:bg-[rgba(255,255,255,0.015)]",
      )}
    >
      <td className="border-t border-[rgba(255,255,255,0.035)] px-4 py-3 align-middle">
        <Checkbox
          checked={isSelected}
          onChange={onToggle}
          ariaLabel={`Select invoice ${invoice.id.slice(0, 8)}`}
        />
      </td>
      <td className="border-t border-[rgba(255,255,255,0.035)] px-4 py-3 align-middle">
        <span className="inline-block rounded border border-[var(--border)] bg-[var(--bg-2)] px-[7px] py-[2px] font-mono text-[11.5px] font-medium tabular-nums text-[var(--text-2)]">
          #{invoice.id.slice(0, 8).toUpperCase()}
        </span>
      </td>
      <td className="border-t border-[rgba(255,255,255,0.035)] px-4 py-3 align-middle">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "relative h-[30px] w-[30px] shrink-0 overflow-hidden rounded-[5px] border border-[var(--border)]",
              invoice.status === "VOID" && "grayscale opacity-60",
            )}
          >
            <div
              className={cn(
                "grid h-full w-full place-items-center text-[11px] font-bold tracking-[-0.01em]",
                gradientClass,
              )}
            >
              {initialsOf(venueName)}
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-[1px]">
            <div
              className={cn(
                "text-[13px] font-medium leading-[1.25] tracking-[-0.005em]",
                invoice.status === "VOID"
                  ? "text-[var(--text-3)]"
                  : "text-[var(--text-1)]",
              )}
            >
              {venueName}
            </div>
            <div className="font-mono text-[10.5px] text-[var(--text-4)]">
              {invoice.venueId}
            </div>
          </div>
        </div>
      </td>
      <td className="border-t border-[rgba(255,255,255,0.035)] px-4 py-3 align-middle">
        <span className="whitespace-nowrap text-[12px] tabular-nums text-[var(--text-3)]">
          {formatPeriod(invoice.periodStart, invoice.periodEnd)}
        </span>
      </td>
      <td className="border-t border-[rgba(255,255,255,0.035)] px-4 py-3 align-middle">
        <AmountCell invoice={invoice} />
      </td>
      <td className="border-t border-[rgba(255,255,255,0.035)] px-4 py-3 align-middle">
        <StatusPill status={invoice.status} />
      </td>
      <td className="border-t border-[rgba(255,255,255,0.035)] px-4 py-3 align-middle">
        <DueDateCell invoice={invoice} urgency={urgency} />
      </td>
      <td className="border-t border-[rgba(255,255,255,0.035)] px-4 py-3 text-right align-middle">
        <RowActions
          invoice={invoice}
          onVoid={onVoid}
          onPaid={onPaid}
          onPdf={onPdf}
        />
      </td>
    </tr>
  );
}

function AmountCell({ invoice }: { invoice: InvoiceResponse }) {
  const toneClass = {
    PAID: "text-[var(--semantic-green)]",
    OVERDUE: "text-[var(--semantic-red)]",
    GENERATED: "text-[var(--text-1)]",
    VOID: "iv2-amount-void",
  }[invoice.status];
  return (
    <span
      className={cn(
        "whitespace-nowrap font-mono text-[13.5px] font-semibold tracking-[-0.01em] tabular-nums",
        toneClass,
      )}
    >
      <span className="mr-0.5 font-sans text-[10px] font-medium text-[var(--text-4)]">
        {invoice.currencyCode}
      </span>
      {formatCurrencyNoSymbol(invoice.amount)}
    </span>
  );
}

function StatusPill({ status }: { status: InvoiceStatus }) {
  if (status === "GENERATED") {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[rgba(99,102,241,0.1)] py-[3px] pl-[7px] pr-[9px] text-[11px] font-medium leading-[1.3] text-[var(--semantic-blue)]">
        <FileText className="h-[11px] w-[11px]" />
        <span>Generated</span>
      </span>
    );
  }
  if (status === "PAID") {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[rgba(16,185,129,0.1)] py-[3px] pl-[7px] pr-[9px] text-[11px] font-medium leading-[1.3] text-[var(--semantic-green)]">
        <CheckCircle className="h-[11px] w-[11px]" />
        <span>Paid</span>
      </span>
    );
  }
  if (status === "OVERDUE") {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[rgba(244,63,94,0.2)] bg-[rgba(244,63,94,0.1)] py-[3px] pl-[7px] pr-[9px] text-[11px] font-medium leading-[1.3] text-[var(--semantic-red)]">
        <span className="iv2-status-dot-overdue h-[5px] w-[5px] rounded-full bg-[var(--semantic-red)] shadow-[0_0_6px_var(--semantic-red)]" />
        <span>Overdue</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/[0.04] py-[3px] pl-[7px] pr-[9px] text-[11px] font-medium leading-[1.3] text-[var(--text-4)]">
      <Ban className="h-[11px] w-[11px]" />
      <span>Void</span>
    </span>
  );
}

function DueDateCell({
  invoice,
  urgency,
}: {
  invoice: InvoiceResponse;
  urgency: Urgency;
}) {
  if (invoice.status === "VOID") {
    return (
      <div className="flex flex-col gap-[1px] whitespace-nowrap">
        <span className="text-[12px] text-[var(--text-4)]">—</span>
      </div>
    );
  }
  if (invoice.status === "PAID") {
    return (
      <div className="flex flex-col gap-[1px] whitespace-nowrap">
        <span className="text-[12px] text-[var(--text-4)] line-through decoration-white/15">
          {formatDate(invoice.dueDate)}
        </span>
        {invoice.paidAt && (
          <span className="font-mono text-[10px] text-[var(--semantic-green)]">
            Paid {formatDate(invoice.paidAt)}
          </span>
        )}
      </div>
    );
  }
  if (urgency === "overdue") {
    const days = daysBetween(new Date().toISOString(), invoice.dueDate);
    return (
      <div className="flex flex-col gap-[1px] whitespace-nowrap">
        <span className="text-[12px] font-medium text-[var(--semantic-red)]">
          Overdue by {days} {days === 1 ? "day" : "days"}
        </span>
        <span className="font-mono text-[10px] font-medium text-[var(--semantic-red)]">
          was {formatDate(invoice.dueDate)}
        </span>
      </div>
    );
  }
  if (urgency === "due-soon") {
    const days = daysBetween(invoice.dueDate, new Date().toISOString());
    return (
      <div className="flex flex-col gap-[1px] whitespace-nowrap">
        <span className="text-[12px] font-medium text-[var(--semantic-amber)]">
          {days === 0
            ? "Due today"
            : `Due in ${days} ${days === 1 ? "day" : "days"}`}
        </span>
        <span className="font-mono text-[10px] font-medium text-[var(--semantic-amber)]">
          {formatDate(invoice.dueDate)}
        </span>
      </div>
    );
  }
  const days = daysBetween(invoice.dueDate, new Date().toISOString());
  return (
    <div className="flex flex-col gap-[1px] whitespace-nowrap">
      <span className="text-[12px] font-medium text-[var(--text-2)]">
        Due in {days} days
      </span>
      <span className="font-mono text-[10px] text-[var(--text-4)]">
        {formatDate(invoice.dueDate)}
      </span>
    </div>
  );
}

function RowActions({
  invoice,
  onVoid,
  onPaid,
  onPdf,
}: {
  invoice: InvoiceResponse;
  onVoid: () => void;
  onPaid: () => void;
  onPdf: () => void;
}) {
  const isTerminal = invoice.status === "PAID" || invoice.status === "VOID";
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={onPdf}
        title="View PDF"
        aria-label={`View invoice ${invoice.id.slice(0, 8)} PDF`}
        className="iv2-btn-pdf grid h-11 w-11 place-items-center rounded border border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-3)] opacity-70 transition-all group-hover:opacity-100 hover:border-[rgba(0,212,170,0.18)] hover:bg-[var(--teal-subtle)] hover:text-[var(--teal-text)]"
      >
        <FileText className="h-[13px] w-[13px]" />
      </button>
      {isTerminal ? (
        <SettledChip status={invoice.status} />
      ) : (
        <>
          <MarkPaidDialog invoice={invoice} onPaid={onPaid} />
          <VoidDialog invoice={invoice} onVoid={onVoid} />
        </>
      )}
    </div>
  );
}

function SettledChip({ status }: { status: InvoiceStatus }) {
  if (status === "PAID") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(16,185,129,0.1)] bg-[rgba(16,185,129,0.05)] px-2 py-1 text-[10.5px] font-medium text-[var(--semantic-green)]">
        <CheckCircle className="h-[10px] w-[10px]" />
        Settled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-white/[0.02] px-2 py-1 text-[10.5px] font-medium text-[var(--text-4)]">
      <Ban className="h-[10px] w-[10px]" />
      Voided
    </span>
  );
}

function MarkPaidDialog({
  invoice,
  onPaid,
}: {
  invoice: InvoiceResponse;
  onPaid: () => void;
}) {
  const [paymentRef, setPaymentRef] = useState("");
  const [isMarking, setIsMarking] = useState(false);
  const [open, setOpen] = useState(false);
  const paymentRefId = useId();

  async function handleMarkPaid() {
    setIsMarking(true);
    try {
      await markInvoicePaid(invoice.id, { paymentReference: paymentRef });
      toast.success("Invoice marked as paid");
      setOpen(false);
      setPaymentRef("");
      onPaid();
    } catch {
      toast.error("Failed to mark invoice as paid");
    } finally {
      setIsMarking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={(props) => (
          <button
            {...props}
            type="button"
            title="Mark as paid"
            aria-label={`Mark invoice ${invoice.id.slice(0, 8)} as paid`}
            className="iv2-btn-paid grid h-11 w-11 place-items-center rounded border border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-3)]"
          >
            <CheckCircle className="h-[13px] w-[13px]" />
          </button>
        )}
      />
      <DialogContent className="border-[var(--border)] bg-[var(--bg-1)]">
        <DialogHeader>
          <DialogTitle>Mark Invoice as Paid</DialogTitle>
          <DialogDescription className="text-[var(--text-3)]">
            Record payment for invoice{" "}
            <span className="font-mono text-[var(--text-2)]">
              #{invoice.id.slice(0, 8).toUpperCase()}
            </span>{" "}
            —{" "}
            <span className="font-mono text-[var(--text-2)]">
              {formatCurrency(invoice.amount, invoice.currencyCode)}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <Label
            htmlFor={paymentRefId}
            className="text-xs font-medium uppercase tracking-wider text-[var(--text-3)]"
          >
            Payment Reference
          </Label>
          <Input
            id={paymentRefId}
            value={paymentRef}
            onChange={(e) => setPaymentRef(e.target.value)}
            placeholder="e.g. bank transfer ref, check #"
            className="border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-1)] placeholder:text-[var(--text-4)] focus:border-[var(--teal)] focus:ring-[3px] focus:ring-[var(--teal-subtle)]"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-2)]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleMarkPaid}
            disabled={!paymentRef.trim() || isMarking}
            className="gap-2 bg-[linear-gradient(135deg,var(--semantic-green)_0%,#059669_100%)] font-medium text-white shadow-[0_0_20px_-4px_rgba(16,185,129,0.35)] hover:brightness-110"
          >
            {isMarking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VoidDialog({
  invoice,
  onVoid,
}: {
  invoice: InvoiceResponse;
  onVoid: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={(props) => (
          <button
            {...props}
            type="button"
            title="Void invoice"
            aria-label={`Void invoice ${invoice.id.slice(0, 8)}`}
            className="grid h-11 w-11 place-items-center rounded border border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-3)] opacity-70 transition-all group-hover:opacity-100 hover:border-[rgba(244,63,94,0.3)] hover:bg-[var(--semantic-red-subtle)] hover:text-[var(--semantic-red)]"
          >
            <XCircle className="h-[13px] w-[13px]" />
          </button>
        )}
      />
      <AlertDialogContent className="border-[var(--border)] bg-[var(--bg-1)]">
        <AlertDialogHeader>
          <AlertDialogTitle>Void this invoice?</AlertDialogTitle>
          <AlertDialogDescription className="text-[var(--text-3)]">
            This action cannot be undone. Invoice{" "}
            <span className="font-mono text-[var(--text-2)]">
              #{invoice.id.slice(0, 8).toUpperCase()}
            </span>{" "}
            for{" "}
            <span className="font-mono text-[var(--text-2)]">
              {formatCurrency(invoice.amount, invoice.currencyCode)}
            </span>{" "}
            will be permanently voided.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-2)]">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onVoid}
            className="bg-[var(--semantic-red-subtle)] text-[var(--semantic-red)] hover:bg-[var(--semantic-red-subtle)] hover:brightness-125"
          >
            Void Invoice
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function InvoicesSkeleton() {
  return (
    <div className="divide-y divide-[rgba(255,255,255,0.035)]">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-[14px] w-[14px] rounded-[3px]" />
          <Skeleton className="h-5 w-20 rounded" />
          <Skeleton className="h-[30px] w-[30px] rounded-[5px]" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-7 w-24 rounded" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  hasInvoices,
  activeFilter,
  onClearFilters,
}: {
  hasInvoices: boolean;
  activeFilter: StatusFilter;
  onClearFilters: () => void;
}) {
  if (!hasInvoices) {
    return (
      <div className="flex flex-col items-center py-16">
        <div className="relative mb-5">
          <div className="absolute -inset-3 rounded-3xl bg-[var(--teal-subtle)] blur-xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--teal-subtle)] to-[var(--teal-subtle)] ring-1 ring-[var(--teal-text)]/10">
            <Receipt className="h-7 w-7 text-[var(--teal-text)]" />
          </div>
        </div>
        <p className="text-base font-medium text-[var(--text-1)]">
          No invoices yet
        </p>
        <p className="mt-1.5 max-w-sm text-center text-sm text-[var(--text-3)]">
          Invoices will appear here once venues are active and billing cycles
          complete
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-2)]">
        <Search className="h-6 w-6 text-[var(--text-4)]" />
      </div>
      <p className="text-base font-medium text-[var(--text-1)]">
        No matching invoices
      </p>
      <p className="mt-1 text-sm text-[var(--text-3)]">
        {activeFilter !== "all"
          ? `No ${activeFilter.toLowerCase()} invoices match your search`
          : "Try a different search"}
      </p>
      <Button
        variant="outline"
        onClick={onClearFilters}
        className="mt-4 border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-2)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]"
      >
        Clear filters
      </Button>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-1)] py-16">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(244,63,94,0.25)] bg-[var(--semantic-red-subtle)]">
        <AlertTriangle className="h-6 w-6 text-[var(--semantic-red)]" />
      </div>
      <p className="text-base font-medium text-[var(--text-1)]">
        Couldn&apos;t load invoices
      </p>
      <p className="mt-1.5 max-w-sm text-center text-sm text-[var(--text-3)]">
        {message}
      </p>
      <Button
        variant="outline"
        onClick={onRetry}
        className="mt-5 gap-1.5 border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-2)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </Button>
    </div>
  );
}
