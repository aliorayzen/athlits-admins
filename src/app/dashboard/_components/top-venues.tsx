import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import type { VenueSummaryResponse } from "@/types/api";
import type { VenueUtilizationResponse } from "@/types/analytics";
import { formatNumber } from "../_lib/format";

export interface RevenueByVenue {
  venueId: string;
  venueName: string;
  revenue: number;
  count: number;
}

interface TopVenuesProps {
  ranking: RevenueByVenue[];
  venueMap: Map<string, VenueSummaryResponse>;
  utilizationMap: Map<string, VenueUtilizationResponse>;
  currency: string;
}

export function TopVenues({
  ranking,
  venueMap,
  utilizationMap,
  currency,
}: TopVenuesProps) {
  const ranked = ranking.slice(0, 6);

  return (
    <div className="dash-fade-up stg-7 rounded-[14px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))] px-6 py-[22px]">
      <div className="mb-[18px] flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13.5px] font-medium text-[var(--text-1)]">
          Top venues
          <span className="rounded-full bg-[rgba(255,255,255,0.04)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--text-3)]">
            by revenue
          </span>
        </div>
        <Link
          href="/dashboard/venues"
          className="grid h-[30px] w-[30px] place-items-center rounded-lg border border-transparent text-[var(--text-3)] transition-all hover:border-[var(--border)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-1)]"
          aria-label="Open full venue list"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="flex flex-col gap-0.5">
        {ranked.length === 0 && (
          <p className="px-2.5 py-4 text-sm text-[var(--text-3)]">
            No paid invoices yet. Revenue ranking appears as venues get paid.
          </p>
        )}
        {ranked.map((r, i) => {
          const venue = venueMap.get(r.venueId);
          const util = utilizationMap.get(r.venueId);
          const pct = util?.utilizationPercent ?? 0;
          return (
            <Link
              key={r.venueId}
              href={`/dashboard/venues/${r.venueId}`}
              className="group grid grid-cols-[auto_1fr_auto_auto] items-center gap-2.5 rounded-[10px] border border-transparent p-2.5 transition-all duration-200 hover:translate-x-0.5 hover:border-[var(--border)] hover:bg-[rgba(255,255,255,0.028)]"
            >
              <div className="w-5 font-mono text-[11px] tabular-nums text-[var(--text-4)]">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium tracking-[-0.005em] text-[var(--text-1)]">
                  {r.venueName}
                </div>
                <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--text-3)]">
                  <span>{venue?.city ?? "—"}</span>
                  {util && (
                    <>
                      <span className="text-[var(--text-5)]">·</span>
                      <span className="tabular-nums">
                        {util.bookingCount} bookings
                      </span>
                      <span className="text-[var(--text-5)]">·</span>
                      <span
                        className={`tabular-nums font-medium ${
                          pct >= 75
                            ? "text-[var(--teal-text)]"
                            : pct >= 50
                              ? "text-[#fcd34d]"
                              : "text-[#fda4af]"
                        }`}
                        title="Utilization % (demo data)"
                      >
                        {pct}%
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3, 4].map((dot) => (
                    <span
                      key={dot}
                      className={`h-1.5 w-1.5 rounded-full transition-transform duration-200 ${
                        dot < Math.round(pct / 20)
                          ? "bg-[var(--teal)] shadow-[0_0_6px_rgba(0,212,170,0.35)] group-hover:scale-125"
                          : "bg-[rgba(0,212,170,0.22)]"
                      }`}
                    />
                  ))}
                </div>
                <span className="min-w-[80px] text-right font-mono text-[11.5px] font-semibold tabular-nums text-[var(--teal-text)]">
                  {currency} {formatNumber(Math.round(r.revenue))}
                </span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 -translate-x-1.5 text-[var(--text-4)] opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
