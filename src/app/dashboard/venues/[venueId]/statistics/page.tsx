"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage, getVenueStatistics } from "@/lib/api";
import type { VenueStatisticsComparison, VenueStatisticsPeriodType, VenueStatisticsResponse } from "@/types/api";

const PERIODS: { value: VenueStatisticsPeriodType; label: string }[] = [
  { value: "WTD", label: "Week to date" },
  { value: "MTD", label: "Month to date" },
  { value: "YTD", label: "Year to date" },
  { value: "CUSTOM", label: "Custom" },
];
const BOOKING_BUCKETS: Array<[keyof VenueStatisticsResponse["bookings"], string, string]> = [
  ["completed", "Completed", "var(--semantic-green)"], ["confirmed", "Confirmed", "var(--teal)"],
  ["pending", "Pending", "var(--semantic-amber)"], ["cancelled", "Cancelled", "var(--semantic-red)"],
  ["noShow", "No-show", "#a78bfa"], ["rejected", "Rejected", "#fb7185"],
  ["expired", "Expired", "var(--text-4)"], ["other", "Other", "var(--semantic-blue)"],
];

export default function VenueStatisticsPage() {
  const { venueId } = useParams<{ venueId: string }>();
  const [period, setPeriod] = useState<VenueStatisticsPeriodType>("MTD");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [data, setData] = useState<VenueStatisticsResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (period === "CUSTOM" && (!start || !end)) {
      setError("Choose both a start and end date for a custom period.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setData(await getVenueStatistics(venueId, { period, ...(period === "CUSTOM" ? { start, end } : {}) }));
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load venue statistics"));
    } finally {
      setLoading(false);
    }
  }, [end, period, start, venueId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-12">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-3"><Link href={`/dashboard/venues/${venueId}`}><Button variant="ghost" size="icon" aria-label="Back to venue"><ArrowLeft className="h-4 w-4" /></Button></Link><div><h1 className="text-[26px] font-semibold tracking-tight text-[var(--text-1)]">{data?.venueName ?? "Venue statistics"}</h1><p className="text-xs text-[var(--text-4)]">Pre-aggregated in {data?.timeZoneId ?? "the venue timezone"}</p></div></div>
        <div className="flex flex-wrap items-end gap-2"><label className="space-y-1"><span className="block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-4)]">Period</span><select value={period} onChange={(e) => setPeriod(e.target.value as VenueStatisticsPeriodType)} className="h-9 rounded-lg border border-[var(--border)] bg-[var(--bg-1)] px-3 text-sm text-[var(--text-2)] outline-none focus:border-[var(--teal)]">{PERIODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>{period === "CUSTOM" && <><label className="space-y-1"><span className="block text-[10px] uppercase tracking-[0.08em] text-[var(--text-4)]">Start</span><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label><label className="space-y-1"><span className="block text-[10px] uppercase tracking-[0.08em] text-[var(--text-4)]">End</span><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label></>}<Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-[rgba(244,63,94,0.2)] bg-[var(--semantic-red-subtle)] px-4 py-3 text-sm text-[var(--semantic-red)]">{error}</p>}
      {loading && !data ? <LoadingState /> : data && <Statistics data={data} />}
    </div>
  );
}

function Statistics({ data }: { data: VenueStatisticsResponse }) {
  const dateLabel = `${formatVenueDate(data.period.start, data.timeZoneId)} to ${formatVenueDate(data.period.end, data.timeZoneId)}`;
  return <>
    <div className="flex items-center gap-2 text-xs text-[var(--text-3)]"><CalendarDays className="h-3.5 w-3.5" /><span>{dateLabel}</span><span>·</span><span>{data.timeZoneId}</span></div>
    <section className="grid gap-3 lg:grid-cols-3">
      <Metric label="Net revenue" value={formatMoney(data.revenue.net, data.revenue.currencyCode)} comparison={data.revenue.comparison} />
      <Metric label="Bookings" value={data.bookings.total.toLocaleString("en-US")} comparison={data.bookings.comparison} />
      <Metric label="Occupancy" value={`${data.occupancy.pct}%`} comparison={data.occupancy.comparison} detail={`${data.occupancy.bookedMinutes.toLocaleString()} of ${data.occupancy.availableMinutes.toLocaleString()} minutes`} />
    </section>
    <Trend data={data} />
    <div className="grid gap-5 lg:grid-cols-5"><BookingMix data={data} /><RevenueDetail data={data} /></div>
    <div className="grid gap-5 lg:grid-cols-2"><CourtBreakdown data={data} /><SportBreakdown data={data} /></div>
  </>;
}

function Metric({ label, value, comparison, detail }: { label: string; value: string; comparison: VenueStatisticsComparison; detail?: string }) {
  return <article className="rounded-xl border border-[var(--border)] bg-[var(--bg-1)] p-5"><p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-4)]">{label}</p><div className="mt-2 flex items-end justify-between gap-3"><p className="font-mono text-2xl font-semibold tabular-nums text-[var(--text-1)]">{value}</p><Comparison comparison={comparison} /></div>{detail && <p className="mt-2 text-xs text-[var(--text-4)]">{detail}</p>}</article>;
}

function Comparison({ comparison }: { comparison: VenueStatisticsComparison }) {
  const positive = comparison.change >= 0;
  if (comparison.changePct == null) return <span className="rounded-md bg-[var(--teal-subtle)] px-2 py-1 text-xs font-semibold text-[var(--teal-text)]">New · +{comparison.change.toLocaleString()}</span>;
  return <span className={`flex items-center gap-1 text-xs font-semibold ${positive ? "text-[var(--semantic-green)]" : "text-[var(--semantic-red)]"}`}>{positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}{positive ? "+" : ""}{comparison.changePct}%</span>;
}

function Trend({ data }: { data: VenueStatisticsResponse }) {
  const max = Math.max(...data.trend.map((point) => point.netRevenue), 1);
  return <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]"><header className="border-b border-[var(--border)] px-5 py-4"><h2 className="text-[15px] font-semibold text-[var(--text-1)]">Daily net revenue</h2><p className="text-xs text-[var(--text-4)]">Every venue-local day is included, including zero-activity days.</p></header><div className="flex h-56 items-end gap-1 overflow-x-auto px-5 pb-5 pt-8">{data.trend.map((point) => <div key={point.date} className="group flex h-full min-w-3 flex-1 items-end" title={`${formatVenueDate(point.date, data.timeZoneId)}: ${formatMoney(point.netRevenue, data.currencyCode)}, ${point.bookings} bookings, ${point.occupancyPct}% occupied`}><div className="w-full rounded-t-sm bg-[var(--teal)]/65 transition-opacity group-hover:opacity-100" style={{ height: `${Math.max((point.netRevenue / max) * 100, point.netRevenue ? 3 : 1)}%` }} /></div>)}</div></section>;
}

function BookingMix({ data }: { data: VenueStatisticsResponse }) {
  return <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] p-5 lg:col-span-3"><h2 className="text-[15px] font-semibold text-[var(--text-1)]">Booking status</h2><div className="mt-4 flex h-2 overflow-hidden rounded-full bg-[var(--bg-2)]">{BOOKING_BUCKETS.map(([key, label, color]) => { const value = data.bookings[key]; return typeof value === "number" && value > 0 ? <span key={key} title={`${label}: ${value}`} style={{ width: `${value / data.bookings.total * 100}%`, background: color }} /> : null; })}</div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{BOOKING_BUCKETS.map(([key, label, color]) => <div key={key} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: color }} /><span className="text-xs text-[var(--text-3)]">{label}</span><span className="ml-auto font-mono text-xs text-[var(--text-1)]">{String(data.bookings[key])}</span></div>)}</div></section>;
}

function RevenueDetail({ data }: { data: VenueStatisticsResponse }) {
  return <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] p-5 lg:col-span-2"><h2 className="text-[15px] font-semibold text-[var(--text-1)]">Revenue detail</h2><dl className="mt-4 space-y-3"><MoneyRow label="Court revenue" value={data.revenue.grossCourt} currency={data.currencyCode} /><MoneyRow label="Equipment" value={data.revenue.grossEquipment} currency={data.currencyCode} /><MoneyRow label="Gross" value={data.revenue.gross} currency={data.currencyCode} strong /><MoneyRow label="Discounts" value={-data.revenue.discounts} currency={data.currencyCode} /><MoneyRow label="Refunds" value={-data.revenue.refunds} currency={data.currencyCode} /><MoneyRow label="Net" value={data.revenue.net} currency={data.currencyCode} strong /></dl></section>;
}

function CourtBreakdown({ data }: { data: VenueStatisticsResponse }) { return <Breakdown title="Courts" note="Court revenue excludes equipment"><table className="w-full text-sm"><thead><tr className="text-left text-[10px] uppercase tracking-[0.08em] text-[var(--text-4)]"><th className="pb-3 font-medium">Court</th><th className="pb-3 text-right font-medium">Bookings</th><th className="pb-3 text-right font-medium">Occupancy</th><th className="pb-3 text-right font-medium">Court revenue</th></tr></thead><tbody>{data.courts.map((court) => <tr key={court.courtId} className="border-t border-[var(--border)]"><td className="py-3 text-[var(--text-2)]">{court.courtName}</td><td className="py-3 text-right font-mono">{court.bookings}</td><td className="py-3 text-right font-mono">{court.occupancyPct}%</td><td className="py-3 text-right font-mono">{formatMoney(court.netRevenue, data.currencyCode)}</td></tr>)}</tbody></table></Breakdown>; }
function SportBreakdown({ data }: { data: VenueStatisticsResponse }) { return <Breakdown title="Sports" note="Only sports with activity are shown"><table className="w-full text-sm"><thead><tr className="text-left text-[10px] uppercase tracking-[0.08em] text-[var(--text-4)]"><th className="pb-3 font-medium">Sport</th><th className="pb-3 text-right font-medium">Bookings</th><th className="pb-3 text-right font-medium">Court revenue</th></tr></thead><tbody>{data.sports.map((sport) => <tr key={sport.sport} className="border-t border-[var(--border)]"><td className="py-3 text-[var(--text-2)]">{sport.sport}</td><td className="py-3 text-right font-mono">{sport.bookings}</td><td className="py-3 text-right font-mono">{formatMoney(sport.netRevenue, data.currencyCode)}</td></tr>)}</tbody></table></Breakdown>; }
function Breakdown({ title, note, children }: { title: string; note: string; children: React.ReactNode }) { return <section className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] p-5"><div className="mb-4"><h2 className="text-[15px] font-semibold text-[var(--text-1)]">{title}</h2><p className="text-xs text-[var(--text-4)]">{note}</p></div>{children}</section>; }
function MoneyRow({ label, value, currency, strong }: { label: string; value: number; currency: string; strong?: boolean }) { return <div className={`flex justify-between border-t border-[var(--border)] pt-3 ${strong ? "font-semibold text-[var(--text-1)]" : "text-[var(--text-3)]"}`}><dt>{label}</dt><dd className="font-mono tabular-nums">{formatMoney(value, currency)}</dd></div>; }
function LoadingState() { return <div className="space-y-5"><div className="grid gap-3 lg:grid-cols-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-28 rounded-xl" />)}</div><Skeleton className="h-72 rounded-2xl" /></div>; }
function formatMoney(value: number, currency: string) { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value); }
function formatVenueDate(value: string, timeZoneId: string) { const [year, month, day] = value.split("-").map(Number); return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: timeZoneId }).format(new Date(Date.UTC(year, month - 1, day, 12))); }
