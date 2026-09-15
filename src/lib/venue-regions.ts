// Grouping venues by Lebanese region for the overview dashboard.
//
// Venues store a plain locality name in `city` (e.g. "Saida", "Beit ed Dine").
// `lebanon-locations-data.json` maps each locality to two levels:
//
//   governorate — 8 values, complete but coarse ("Mount Lebanon")
//   city        — 13 values, a partial district refinement that names the
//                 districts operators actually talk about ("Saida", "Matn",
//                 "Keserwan", "Jezzîne", "Bent Jbaïl") and falls back to the
//                 governorate elsewhere
//
// The second is the axis this dashboard reports on: it is the finer grain where
// one exists, without inventing districts the dataset cannot resolve.

import { findLebanonLocation } from "./lebanon-locations.ts";
import { cityName } from "./venue-locality.ts";

export interface RegionBreakdown {
  region: string;
  total: number;
  active: number;
  suspended: number;
}

/** Venue shape this module needs; keeps it decoupled from the full DTO. */
export interface RegionalVenue {
  city: string;
  status?: string;
}

export const UNKNOWN_REGION = "Unassigned";

/**
 * Region for a stored locality name. Returns `UNKNOWN_REGION` when the locality
 * is blank or not in the dataset, so a venue never silently vanishes from a
 * chart that is meant to total to the venue count.
 */
export function venueRegion(city: string | null | undefined): string {
  const locality = cityName(city);
  if (!locality) return UNKNOWN_REGION;
  return findLebanonLocation(locality)?.city ?? UNKNOWN_REGION;
}

/**
 * Venues per region, largest first, ties broken alphabetically so the order is
 * stable between renders. `UNKNOWN_REGION` always sorts last: it is a data-
 * quality bucket, not a place, and should not top the chart on a tie.
 */
export function groupVenuesByRegion(
  venues: readonly RegionalVenue[],
): RegionBreakdown[] {
  const byRegion = new Map<string, RegionBreakdown>();

  for (const venue of venues) {
    const region = venueRegion(venue.city);
    const entry = byRegion.get(region) ?? {
      region,
      total: 0,
      active: 0,
      suspended: 0,
    };
    entry.total += 1;
    if (venue.status === "SUSPENDED") entry.suspended += 1;
    else entry.active += 1;
    byRegion.set(region, entry);
  }

  return [...byRegion.values()].sort((a, b) => {
    const aUnknown = a.region === UNKNOWN_REGION;
    const bUnknown = b.region === UNKNOWN_REGION;
    if (aUnknown !== bUnknown) return aUnknown ? 1 : -1;
    if (b.total !== a.total) return b.total - a.total;
    return a.region.localeCompare(b.region);
  });
}
