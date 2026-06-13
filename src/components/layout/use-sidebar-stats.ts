"use client";

import { useEffect, useState } from "react";
import { getInvoices, getVenues } from "@/lib/api";

export interface SidebarStats {
  venuesTotal: number | null;
  venuesActive: number | null;
  invoicesOverdue: number | null;
  isLoading: boolean;
}

const INITIAL_STATS: SidebarStats = {
  venuesTotal: null,
  venuesActive: null,
  invoicesOverdue: null,
  isLoading: true,
};

export function useSidebarStats(): SidebarStats {
  const [stats, setStats] = useState<SidebarStats>(INITIAL_STATS);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [venuesResult, invoicesResult] = await Promise.allSettled([
        getVenues(),
        getInvoices({ status: "OVERDUE", size: 1 }),
      ]);

      if (cancelled) return;

      // Real data only. If the venues call failed, leave the counts null so the
      // sidebar shows "—" rather than a fabricated number.
      const venuesOk = venuesResult.status === "fulfilled";
      const venues = venuesOk ? venuesResult.value : [];
      const venuesTotal = venuesOk ? venues.length : null;
      const venuesActive = venuesOk
        ? venues.filter((v) => v.status === "ACTIVE").length
        : null;
      const invoicesOverdue =
        invoicesResult.status === "fulfilled"
          ? (invoicesResult.value.totalElements ?? 0)
          : null;

      setStats({
        venuesTotal,
        venuesActive,
        invoicesOverdue,
        isLoading: false,
      });
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return stats;
}
