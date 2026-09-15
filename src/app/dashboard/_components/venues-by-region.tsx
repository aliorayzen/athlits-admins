"use client";

import { MapPin } from "lucide-react";
import { useMemo } from "react";

import { groupVenuesByRegion, UNKNOWN_REGION } from "@/lib/venue-regions";
import type { VenueSummaryResponse } from "@/types/api";

/**
 * Venue distribution across Lebanese regions.
 *
 * A ranked bar list rather than a pie: operators compare regions against each
 * other and read exact counts, both of which bars do better than wedges. Each
 * bar is split active vs. suspended so a region that looks well covered but is
 * half dark is visible at a glance.
 */
export function VenuesByRegion({ venues }: { venues: VenueSummaryResponse[] }) {
  const regions = useMemo(() => groupVenuesByRegion(venues), [venues]);
  const max = regions[0]?.total ?? 0;

  return (
    <section className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-1)] p-5">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-1)]">
            <MapPin className="h-4 w-4 text-[var(--teal-text)]" />
            Venues by region
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--text-3)]">
            Districts where the dataset names one, governorates elsewhere.
          </p>
        </div>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--text-4)]">
          {regions.length} {regions.length === 1 ? "region" : "regions"}
        </span>
      </header>

      {regions.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--text-3)]">
          No venues yet. Regions appear as venues are onboarded.
        </p>
      ) : (
        <ol className="space-y-2.5">
          {regions.map((region) => {
            const share = max > 0 ? (region.total / max) * 100 : 0;
            const suspendedShare =
              region.total > 0 ? (region.suspended / region.total) * 100 : 0;
            const unassigned = region.region === UNKNOWN_REGION;

            return (
              <li key={region.region}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span
                    className={
                      unassigned
                        ? "text-[12.5px] italic text-[var(--text-3)]"
                        : "text-[12.5px] text-[var(--text-2)]"
                    }
                  >
                    {region.region}
                  </span>
                  <span className="shrink-0 font-mono text-[11.5px] tabular-nums text-[var(--text-2)]">
                    {region.total}
                    {region.suspended > 0 && (
                      <span className="ml-1.5 text-[var(--red-text)]">
                        {region.suspended} suspended
                      </span>
                    )}
                  </span>
                </div>
                {/* Width is the region's share of the largest region, so bars
                    stay comparable; the split inside shows health. */}
                <div
                  className="h-2 overflow-hidden rounded-full bg-[var(--bg-2)]"
                  role="img"
                  aria-label={`${region.region}: ${region.total} venues, ${region.suspended} suspended`}
                >
                  <div
                    className="flex h-full"
                    style={{ width: `${Math.max(share, 3)}%` }}
                  >
                    <div
                      className="h-full bg-[var(--teal)]"
                      style={{ width: `${100 - suspendedShare}%` }}
                    />
                    <div
                      className="h-full bg-[var(--semantic-red)]"
                      style={{ width: `${suspendedShare}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
