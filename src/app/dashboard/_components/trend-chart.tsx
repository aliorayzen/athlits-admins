"use client";

import { WidgetUnavailable } from "@/components/dashboard/tier2-widgets";

/** Bookings trend has no analytics endpoint yet — honest empty state. */
export function TrendChart() {
  return <WidgetUnavailable title="Bookings trend" className="min-h-[300px]" />;
}
