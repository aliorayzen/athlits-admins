"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  MapPin,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage, getVenue, getVenues } from "@/lib/api";
import type { VenueDetailResponse } from "@/types/api";

export function ManagerVenuesDirectory({
  managerId,
  managerName,
}: {
  managerId: string;
  managerName?: string;
}) {
  const [venues, setVenues] = useState<VenueDetailResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function loadManagerVenues() {
      setIsLoading(true);
      setError(null);
      try {
        const summaries = await getVenues();
        const details = await Promise.all(
          summaries.map((venue) => getVenue(venue.id)),
        );
        if (!cancelled) {
          setVenues(details.filter((venue) => venue.managerId === managerId));
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setVenues([]);
          setError(
            getApiErrorMessage(
              err,
              "Couldn't load this manager's venues. Please try again.",
            ),
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadManagerVenues();
    return () => {
      cancelled = true;
    };
  }, [managerId, reloadKey]);

  const managerLabel = managerName || "this venue manager";

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <Link
          href="/dashboard/users/venue-managers"
          aria-label="Back to venue managers"
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[var(--border)] bg-[var(--bg-1)] text-[var(--text-3)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-amber-subtle)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-1)]">
              Venues
            </h1>
            {!isLoading && !error && (
              <span className="rounded-full border border-[rgb(var(--amber-rgb)/0.2)] bg-[var(--semantic-amber-subtle)] px-2 py-0.5 font-mono text-[11px] text-[var(--amber-text)]">
                {venues.length}
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] text-[var(--text-3)]">
            Choose a venue managed by {managerLabel}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)]">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-4 last:border-b-0"
            >
              <Skeleton className="h-9 w-9 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--bg-1)] px-5 py-14 text-center">
          <AlertTriangle className="h-6 w-6 text-[var(--red-text)]" />
          <h2 className="mt-3 text-sm font-semibold text-[var(--text-1)]">
            Couldn&apos;t load venues
          </h2>
          <p className="mt-1 max-w-md text-[13px] text-[var(--text-3)]">
            {error}
          </p>
          <Button variant="outline" onClick={retry} className="mt-4 gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      ) : venues.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--bg-1)] px-5 py-14 text-center">
          <Building2 className="h-7 w-7 text-[var(--text-4)]" />
          <h2 className="mt-3 text-sm font-semibold text-[var(--text-1)]">
            No assigned venues
          </h2>
          <p className="mt-1 text-[13px] text-[var(--text-3)]">
            {managerLabel} does not currently manage a venue.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)]">
          {venues.map((venue) => (
            <Link
              key={venue.id}
              href={`/dashboard/venues/${venue.id}`}
              className="group flex items-center gap-3 border-b border-[var(--border)] px-4 py-3.5 transition-colors last:border-b-0 hover:bg-[var(--semantic-amber-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--semantic-amber-subtle)]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[rgb(var(--amber-rgb)/0.18)] bg-[var(--semantic-amber-subtle)] text-[var(--amber-text)]">
                <Building2 className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-[var(--text-1)]">
                  {venue.name}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-[11.5px] text-[var(--text-4)]">
                  <MapPin className="h-3 w-3" />
                  {venue.city}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-3)] transition-colors group-hover:text-[var(--amber-text)]">
                Choose
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
