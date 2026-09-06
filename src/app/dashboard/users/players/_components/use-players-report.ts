"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getAdminPlayers, getApiErrorMessage } from "@/lib/api";
import type {
  PageResponse,
  PlayerDirectoryQuery,
  PlayerReportItem,
  PlayerSortBy,
  SortDirection,
  UserStatus,
} from "@/types/api";

export const PLAYER_PAGE_SIZE = 20;

export interface PlayerReportFilters {
  accountStatus: UserStatus[];
  registeredFrom: string;
  registeredTo: string;
  reservationStatus: string[];
  paid: "" | "true" | "false";
}

export const EMPTY_PLAYER_FILTERS: PlayerReportFilters = {
  accountStatus: [],
  registeredFrom: "",
  registeredTo: "",
  reservationStatus: [],
  paid: "",
};

export interface PlayersReportState {
  data: PageResponse<PlayerReportItem> | null;
  error: string;
  isLoading: boolean;
  isFetching: boolean;
  page: number;
  search: string;
  filters: PlayerReportFilters;
  sortBy: PlayerSortBy;
  direction: SortDirection;
  queryKey: string;
  setSearch: (value: string) => void;
  setFilters: (filters: PlayerReportFilters) => void;
  setSortBy: (sort: PlayerSortBy) => void;
  toggleDirection: () => void;
  goToPage: (page: number) => void;
  retry: () => void;
}

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs, value]);
  return debounced;
}

function toQuery(
  search: string,
  filters: PlayerReportFilters,
  sortBy: PlayerSortBy,
  direction: SortDirection,
  page: number,
): PlayerDirectoryQuery {
  return {
    q: search || undefined,
    accountStatus:
      filters.accountStatus.length > 0 ? filters.accountStatus : undefined,
    registeredFrom: filters.registeredFrom || undefined,
    registeredTo: filters.registeredTo || undefined,
    reservationStatus:
      filters.reservationStatus.length > 0
        ? filters.reservationStatus
        : undefined,
    paid: filters.paid === "" ? undefined : filters.paid === "true",
    sortBy,
    direction,
    page,
    size: PLAYER_PAGE_SIZE,
  };
}

export function usePlayersReport(): PlayersReportState {
  const [search, setSearchValue] = useState("");
  const [filters, setFiltersValue] = useState(EMPTY_PLAYER_FILTERS);
  const [sortBy, setSortByValue] =
    useState<PlayerSortBy>("LAST_BOOKING_DATE");
  const [direction, setDirection] = useState<SortDirection>("DESC");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageResponse<PlayerReportItem> | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const requestSequence = useRef(0);
  const hasLoadedOnce = useRef(false);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const query = useMemo(
    () => toQuery(debouncedSearch, filters, sortBy, direction, page),
    [debouncedSearch, direction, filters, page, sortBy],
  );

  useEffect(() => {
    const sequence = ++requestSequence.current;

    async function load() {
      setIsFetching(true);
      if (!hasLoadedOnce.current) setIsLoading(true);
      try {
        const response = await getAdminPlayers(query);
        if (sequence !== requestSequence.current) return;
        setData(response);
        setError("");
        hasLoadedOnce.current = true;
      } catch (loadError: unknown) {
        if (sequence !== requestSequence.current) return;
        setError(
          getApiErrorMessage(
            loadError,
            "Couldn't load player reporting. Check your connection and try again.",
          ),
        );
      } finally {
        if (sequence === requestSequence.current) {
          setIsLoading(false);
          setIsFetching(false);
        }
      }
    }

    void load();
  }, [query, reloadToken]);

  const setSearch = useCallback((value: string) => {
    setSearchValue(value);
    setPage(0);
  }, []);

  const setFilters = useCallback((next: PlayerReportFilters) => {
    setFiltersValue(next);
    setPage(0);
  }, []);

  const setSortBy = useCallback((next: PlayerSortBy) => {
    setSortByValue(next);
    setPage(0);
  }, []);

  const toggleDirection = useCallback(() => {
    setDirection((current) => (current === "ASC" ? "DESC" : "ASC"));
    setPage(0);
  }, []);

  const goToPage = useCallback((next: number) => {
    setPage(Math.max(0, next));
  }, []);

  const retry = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const queryKey = JSON.stringify(query);

  return {
    data,
    error,
    isLoading,
    isFetching,
    page,
    search,
    filters,
    sortBy,
    direction,
    queryKey,
    setSearch,
    setFilters,
    setSortBy,
    toggleDirection,
    goToPage,
    retry,
  };
}
