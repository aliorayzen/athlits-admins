import { useMemo } from "react";
import type { InvoiceResponse, VenueSummaryResponse } from "@/types/api";
import type { RevenueByVenue } from "../_components/top-venues";

export interface DashboardMetrics {
  totalRevenue: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  momDelta: number | null;
  currency: "USD";
  collectionRate: number;
  paidCount: number;
  totalInvoiced: number;
  aov: number;
  p50Days: number;
  newVenuesThisMonth: number;
  upcoming: InvoiceResponse[];
  upcomingSum: number;
  activeVenues: number;
  totalVenues: number;
  overdue: number;
}

// Pure derivation from the two server-fetched arrays. Memoized on identity so
// the cost is paid once per fetch, not once per render.
export function useDashboardMetrics(
  venues: VenueSummaryResponse[],
  invoices: InvoiceResponse[],
): DashboardMetrics {
  return useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );

    const paid = invoices.filter((i) => i.status === "PAID");
    const overdueInv = invoices.filter((i) => i.status === "OVERDUE");
    const generated = invoices.filter((i) => i.status === "GENERATED");
    const activeVenues = venues.filter((v) => v.status === "ACTIVE").length;

    const thisMonthPaid = paid.filter((i) => {
      const d = i.paidAt ? new Date(i.paidAt) : null;
      return d !== null && d >= thisMonthStart;
    });
    const lastMonthPaid = paid.filter((i) => {
      const d = i.paidAt ? new Date(i.paidAt) : null;
      return d !== null && d >= lastMonthStart && d <= lastMonthEnd;
    });

    const thisMonthRevenue = thisMonthPaid.reduce((s, i) => s + i.amount, 0);
    const lastMonthRevenue = lastMonthPaid.reduce((s, i) => s + i.amount, 0);
    const totalRevenue = paid.reduce((s, i) => s + i.amount, 0);

    let momDelta: number | null = null;
    if (lastMonthRevenue > 0) {
      momDelta =
        ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    } else if (thisMonthRevenue > 0) {
      momDelta = 100;
    }

    const totalInvoiced = paid.length + overdueInv.length + generated.length;
    const collectionRate =
      totalInvoiced > 0 ? Math.round((paid.length / totalInvoiced) * 100) : 0;

    const aov = paid.length > 0 ? totalRevenue / paid.length : 0;

    // Days-to-pay P50 — positive means late, negative means early.
    const daysToPay = paid
      .filter((i) => i.paidAt)
      .map((i) => {
        const due = new Date(i.dueDate).getTime();
        const paidTs = new Date(i.paidAt ?? 0).getTime();
        return (paidTs - due) / (1000 * 60 * 60 * 24);
      })
      .sort((a, b) => a - b);
    const p50Days =
      daysToPay.length > 0 ? daysToPay[Math.floor(daysToPay.length / 2)] : 0;

    const newVenuesThisMonth = venues.filter(
      (v) => new Date(v.createdAt) >= thisMonthStart,
    ).length;

    const upcoming = invoices
      .filter((i) => i.status !== "PAID" && i.status !== "VOID")
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      );
    const upcomingSum = upcoming.reduce((s, i) => s + i.amount, 0);

    return {
      totalRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      momDelta,
      currency: "USD",
      collectionRate,
      paidCount: paid.length,
      totalInvoiced,
      aov,
      p50Days,
      newVenuesThisMonth,
      upcoming,
      upcomingSum,
      activeVenues,
      totalVenues: venues.length,
      overdue: overdueInv.length,
    };
  }, [venues, invoices]);
}

export function useVenueMap(
  venues: VenueSummaryResponse[],
): Map<string, VenueSummaryResponse> {
  return useMemo(() => {
    const m = new Map<string, VenueSummaryResponse>();
    venues.forEach((v) => m.set(v.id, v));
    return m;
  }, [venues]);
}

export function useRevenueByVenue(
  invoices: InvoiceResponse[],
  venueMap: Map<string, VenueSummaryResponse>,
): RevenueByVenue[] {
  return useMemo(() => {
    const byVenue = new Map<string, RevenueByVenue>();
    invoices
      .filter((i) => i.status === "PAID")
      .forEach((i) => {
        const existing = byVenue.get(i.venueId);
        const name =
          i.venueName ?? venueMap.get(i.venueId)?.name ?? "Unknown venue";
        if (existing) {
          existing.revenue += i.amount;
          existing.count += 1;
        } else {
          byVenue.set(i.venueId, {
            venueId: i.venueId,
            venueName: name,
            revenue: i.amount,
            count: 1,
          });
        }
      });
    return Array.from(byVenue.values()).sort((a, b) => b.revenue - a.revenue);
  }, [invoices, venueMap]);
}

export function useSpectrumSegments(
  venues: VenueSummaryResponse[],
): { label: string; value: number }[] {
  return useMemo(() => {
    const byCity = new Map<string, number>();
    venues.forEach((v) => {
      byCity.set(v.city, (byCity.get(v.city) ?? 0) + 1);
    });
    return Array.from(byCity.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [venues]);
}
