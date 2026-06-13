import Link from "next/link";
import { ChevronRight, Eye, MoreHorizontal } from "lucide-react";
import type { InvoiceResponse, VenueSummaryResponse } from "@/types/api";
import {
  formatNumber,
  formatShortDate,
  formatSlot,
  initials,
} from "../_lib/format";
import {
  statusDotStyles,
  statusLabel,
  statusStyles,
} from "../_lib/invoice-status";

interface BookingsTableProps {
  invoices: InvoiceResponse[];
  venueMap: Map<string, VenueSummaryResponse>;
  mode: "upcoming" | "recent";
}

export function BookingsTable({
  invoices,
  venueMap,
  mode,
}: BookingsTableProps) {
  const rows = invoices.slice(0, 6);
  const title = mode === "upcoming" ? "Upcoming due" : "Recent invoices";
  const hint = mode === "upcoming" ? "next to pay" : "latest activity";
  const emptyCopy =
    mode === "upcoming"
      ? "No invoices due. Everything is paid or upcoming billing hasn't started."
      : "No invoices yet. They appear here after venues generate bookings.";

  return (
    <div className="dash-fade-up stg-7 overflow-hidden rounded-[14px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))] py-[22px] pb-3">
      <div className="mb-[18px] flex items-center justify-between px-6">
        <div className="flex items-center gap-2 text-[13.5px] font-medium text-[var(--text-1)]">
          {title}
          <span className="rounded-full bg-[rgba(255,255,255,0.04)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--text-3)]">
            {hint}
          </span>
        </div>
        <Link
          href="/dashboard/invoices"
          className="inline-flex items-center gap-1 rounded-[10px] border border-[var(--border-strong)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-xs font-medium text-[var(--text-2)] transition-all hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text-1)]"
        >
          View all
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="px-6 py-6 text-sm text-[var(--text-3)]">{emptyCopy}</p>
      ) : (
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["Venue", "Period", "Due", "Amount", "Status", ""].map(
                (h, i) => (
                  <th
                    key={i}
                    className="border-b border-[var(--border)] bg-[rgba(255,255,255,0.012)] px-6 py-3 text-left font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--text-3)]"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="row-stagger">
            {rows.map((inv) => {
              const venue = venueMap.get(inv.venueId);
              const name = inv.venueName ?? venue?.name ?? "—";
              return (
                <tr
                  key={inv.id}
                  className="border-b border-[rgba(255,255,255,0.035)] last:border-b-0 hover:bg-[rgba(255,255,255,0.022)]"
                >
                  <td className="px-6 py-3.5 text-[var(--text-2)]">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-[linear-gradient(135deg,#2d3340,#1a1e26)] text-[10.5px] font-semibold text-[var(--text-1)]">
                        {initials(name)}
                      </div>
                      <span className="font-medium tracking-[-0.005em] text-[var(--text-1)]">
                        {name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 tabular-nums text-[var(--text-2)]">
                    {formatShortDate(inv.periodStart)} →{" "}
                    {formatShortDate(inv.periodEnd)}
                  </td>
                  <td className="px-6 py-3.5 tabular-nums text-[var(--text-2)]">
                    {formatSlot(inv.dueDate)}
                  </td>
                  <td className="px-6 py-3.5 font-mono font-semibold tabular-nums text-[var(--text-1)]">
                    USD {formatNumber(inv.amount)}
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium tracking-[-0.002em] ${statusStyles(inv.status)}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${statusDotStyles(inv.status)}`}
                      />
                      {statusLabel(inv.status)}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/dashboard/invoices`}
                        className="grid h-[30px] w-[30px] place-items-center rounded-lg border border-transparent text-[var(--text-3)] transition-all hover:border-[var(--border)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-1)]"
                        aria-label="View invoice"
                        title="View"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        className="grid h-[30px] w-[30px] place-items-center rounded-lg border border-transparent text-[var(--text-3)] transition-all hover:border-[var(--border)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-1)]"
                        aria-label="More actions"
                        title="More"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
