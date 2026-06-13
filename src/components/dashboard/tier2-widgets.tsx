"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import type { VenueUtilizationResponse } from "@/types/analytics";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Shared "awaiting endpoint" state. These analytics have no backend
   endpoint yet, so every widget shows an honest empty state instead of
   fabricated data.
   ─────────────────────────────────────────────────────────────── */

export function WidgetUnavailable({
  title,
  badge,
  className,
}: {
  title: string;
  badge?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "dash-fade-up flex min-h-[150px] flex-col rounded-[14px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))] px-6 py-[22px]",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-[13.5px] font-medium text-[var(--text-1)]">
        {title}
        {badge && (
          <span className="rounded-full bg-[rgba(255,255,255,0.04)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--text-3)]">
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-6 text-center">
        <div className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-white/[0.02]">
          <BarChart3 className="h-4 w-4 text-[var(--text-4)]" />
        </div>
        <div className="text-[13px] font-medium text-[var(--text-2)]">
          Analytics not available yet
        </div>
        <div className="max-w-[320px] text-[12px] text-[var(--text-4)]">
          This metric will populate once the analytics endpoint ships.
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Venue utilization map. No endpoint yet, so this is always empty;
   consumers (TopVenues) degrade gracefully to revenue-only ranking.
   ─────────────────────────────────────────────────────────────── */

export function useVenueUtilization(): Map<string, VenueUtilizationResponse> {
  return useMemo(() => new Map<string, VenueUtilizationResponse>(), []);
}

/* ═══════════════════════════════════════════════════════════════
   Widgets — each awaits its analytics endpoint.
   ─────────────────────────────────────────────────────────────── */

export function BookingStatsStrip() {
  return <WidgetUnavailable title="Booking performance" />;
}

export function RevenueBySportSpectrum() {
  return <WidgetUnavailable title="Revenue by sport" badge="this month" />;
}

export function PeakHoursHeatmap() {
  return <WidgetUnavailable title="Peak booking hours" badge="7d × 24h" />;
}

export function PlatformRatingTrend() {
  return <WidgetUnavailable title="Platform rating · 12mo" />;
}
