"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ChevronDown, Download, Plus } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getInvoices, getVenues } from "@/lib/api";
import type { InvoiceResponse, VenueSummaryResponse } from "@/types/api";
import {
  BookingStatsStrip,
  PeakHoursHeatmap,
  PlatformRatingTrend,
  RevenueBySportSpectrum,
  useVenueUtilization,
} from "@/components/dashboard/tier2-widgets";

import { BookingsTable } from "./_components/bookings-table";
import { DashboardSkeleton } from "./_components/dashboard-skeleton";
import {
  BarSpark,
  CurveSpark,
  FlatSpark,
  HeroSpark,
  KpiCard,
} from "./_components/kpi-card";
import { SecondaryStatsStrip } from "./_components/secondary-stats-strip";
import { SpectrumBar } from "./_components/spectrum-bar";
import { TopVenues } from "./_components/top-venues";
import { TrendChart } from "./_components/trend-chart";
import {
  useDashboardMetrics,
  useRevenueByVenue,
  useSpectrumSegments,
  useVenueMap,
} from "./_hooks/use-dashboard-metrics";
import { formatNumber, getGreeting } from "./_lib/format";

export default function DashboardPage() {
  const { user } = useAuth();
  const [venues, setVenues] = useState<VenueSummaryResponse[]>([]);
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [venueData, invoiceData] = await Promise.allSettled([
          getVenues(),
          getInvoices({ size: 100 }),
        ]);
        if (venueData.status === "fulfilled") setVenues(venueData.value);
        if (invoiceData.status === "fulfilled")
          setInvoices(invoiceData.value.content ?? []);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const metrics = useDashboardMetrics(venues, invoices);
  const venueMap = useVenueMap(venues);
  const revenueByVenue = useRevenueByVenue(invoices, venueMap);
  const spectrumSegments = useSpectrumSegments(venues);

  // Tier 2 analytics — no backend endpoint yet, so these resolve to empty and
  // the widgets render honest "awaiting endpoint" states.
  const utilizationMap = useVenueUtilization();

  const citiesCount = new Set(venues.map((v) => v.city)).size;
  const displayName = user?.firstName ?? "Admin";

  if (isLoading) {
    return (
      <div className="dashboard-root">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="dashboard-root space-y-6">
      {/* Greeting + header actions */}
      <div className="dash-fade-up stg-1 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-3)]">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--teal)] shadow-[0_0_6px_rgba(0,212,170,0.35)]" />
            <span>
              Operating {citiesCount || 0}{" "}
              {citiesCount === 1 ? "city" : "cities"} · {metrics.totalVenues}{" "}
              venues · all operational
            </span>
          </div>
          <h1
            className="text-[clamp(30px,3vw,40px)] font-semibold leading-[1.02] tracking-[-0.03em]"
            style={{
              background:
                "linear-gradient(135deg, var(--text-1) 0%, var(--teal-text) 160%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {getGreeting()}, {displayName}
          </h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-[var(--text-3)]">
            <span>Here&apos;s how Athlits is doing today.</span>
            <span className="border-l border-[var(--border)] pl-2 font-mono text-[11px] tabular-nums text-[var(--text-4)]">
              Updated just now
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--border-strong)] bg-[rgba(255,255,255,0.03)] px-3.5 py-2 text-[13px] font-medium text-[var(--text-2)] transition-all hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text-1)] active:scale-[0.97]"
          >
            <Calendar className="h-3.5 w-3.5" />
            Today
            <ChevronDown className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--border-strong)] bg-[rgba(255,255,255,0.03)] px-3.5 py-2 text-[13px] font-medium text-[var(--text-2)] transition-all hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text-1)] active:scale-[0.97]"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <Link
            href="/dashboard/venues/new"
            className="group inline-flex items-center gap-1.5 rounded-[10px] bg-[linear-gradient(135deg,var(--teal),#00b894)] px-3.5 py-2 text-[13px] font-semibold text-[#001814] shadow-[0_4px_14px_rgba(0,212,170,0.25),inset_0_0_0_1px_rgba(0,212,170,0.3)] transition-all hover:-translate-y-px hover:bg-[linear-gradient(135deg,#00e6b9,var(--teal))] hover:shadow-[0_6px_22px_rgba(0,212,170,0.4),inset_0_0_0_1px_rgba(0,212,170,0.4)] active:translate-y-0 active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-90" />
            New venue
          </Link>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <KpiCard
          hero
          staggerClass="stg-2"
          label="Revenue · this month"
          value={formatNumber(Math.round(metrics.thisMonthRevenue))}
          currency={metrics.currency}
          delta={
            metrics.momDelta !== null
              ? `${Math.abs(metrics.momDelta).toFixed(1)}%`
              : "—"
          }
          deltaType={
            metrics.momDelta === null
              ? "flat"
              : metrics.momDelta >= 0
                ? "up"
                : "down"
          }
          context={
            metrics.momDelta !== null
              ? "vs last month"
              : metrics.thisMonthRevenue > 0
                ? "first month"
                : "no data yet"
          }
          spark={<HeroSpark />}
        />
        <KpiCard
          staggerClass="stg-3"
          label="Collection rate"
          value={`${metrics.collectionRate}%`}
          delta={
            metrics.totalInvoiced > 0
              ? `${metrics.paidCount}/${metrics.totalInvoiced}`
              : "—"
          }
          deltaType={
            metrics.collectionRate >= 80
              ? "up"
              : metrics.collectionRate >= 50
                ? "flat"
                : "down"
          }
          context={
            metrics.totalInvoiced > 0 ? "paid of invoiced" : "nothing invoiced"
          }
          spark={<BarSpark />}
        />
        <KpiCard
          staggerClass="stg-4"
          label="Active venues"
          value={String(metrics.activeVenues)}
          delta="0"
          deltaType="flat"
          context={
            metrics.activeVenues === metrics.totalVenues
              ? "all operational"
              : `${metrics.totalVenues - metrics.activeVenues} suspended`
          }
          spark={<FlatSpark />}
        />
        <KpiCard
          staggerClass="stg-5"
          label="Overdue invoices"
          value={String(metrics.overdue)}
          delta={metrics.overdue > 0 ? "needs attention" : "all clear"}
          deltaType={metrics.overdue > 0 ? "down" : "up"}
          context={metrics.overdue > 0 ? "action required" : "nothing due"}
          spark={<CurveSpark />}
        />
      </div>

      <SecondaryStatsStrip
        stats={[
          {
            label: "Avg invoice",
            value:
              metrics.aov > 0
                ? `${metrics.currency} ${formatNumber(Math.round(metrics.aov))}`
                : "—",
            hint: metrics.aov > 0 ? "per invoice" : "no paid invoices",
          },
          {
            label: "New venues · MTD",
            value: `+${metrics.newVenuesThisMonth}`,
            hint:
              metrics.newVenuesThisMonth > 0 ? "this month" : "none this month",
            tone: metrics.newVenuesThisMonth > 0 ? "teal" : "neutral",
          },
          {
            label: "Upcoming due",
            value: `${metrics.upcoming.length}`,
            hint:
              metrics.upcoming.length > 0
                ? `${metrics.currency} ${formatNumber(Math.round(metrics.upcomingSum))}`
                : "all clear",
            tone:
              metrics.upcoming.length > 0
                ? metrics.overdue > 0
                  ? "rose"
                  : "amber"
                : "teal",
          },
          {
            label: "Days to pay · P50",
            value:
              metrics.paidCount > 0
                ? `${metrics.p50Days > 0 ? "+" : ""}${metrics.p50Days.toFixed(1)}d`
                : "—",
            hint:
              metrics.paidCount === 0
                ? "no paid invoices"
                : metrics.p50Days > 2
                  ? "paying late"
                  : metrics.p50Days < -1
                    ? "paying early"
                    : "on time",
            tone:
              metrics.paidCount === 0
                ? "neutral"
                : metrics.p50Days > 2
                  ? "rose"
                  : metrics.p50Days < 0
                    ? "teal"
                    : "neutral",
          },
        ]}
      />

      <BookingStatsStrip />

      {spectrumSegments.length > 0 && (
        <SpectrumBar segments={spectrumSegments} />
      )}

      <RevenueBySportSpectrum />

      <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
        <TrendChart />
        <TopVenues
          ranking={revenueByVenue}
          venueMap={venueMap}
          utilizationMap={utilizationMap}
          currency={metrics.currency}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <PeakHoursHeatmap />
        <PlatformRatingTrend />
      </div>

      <BookingsTable
        invoices={metrics.upcoming.length > 0 ? metrics.upcoming : invoices}
        venueMap={venueMap}
        mode={metrics.upcoming.length > 0 ? "upcoming" : "recent"}
      />
    </div>
  );
}
