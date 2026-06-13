"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import type { PageQuery, PageResponse, UserDto } from "@/types/api";

/** One page of users at a time — every directory built on this is server-paginated. */
export const PAGE_SIZE = 12;

/** First-load lifecycle. Background refetches (page/search/sort) keep the last
 *  good page on screen and surface failures as a toast instead of a full wipe. */
export type Phase = "loading" | "error" | "ready";

export interface SortOption {
  /** Stable key used in the toolbar + state. */
  key: string;
  /** Human label rendered in the sort control. */
  label: string;
  /** Spring `sort` query value, e.g. "firstName,asc". */
  param: string;
}

export interface UserDirectory {
  phase: Phase;
  isFetching: boolean;
  errorMessage: string;
  page: number;
  search: string;
  sort: string;
  sortOptions: SortOption[];
  data: PageResponse<UserDto> | null;
  setSearch: (value: string) => void;
  setSort: (key: string) => void;
  goToPage: (page: number) => void;
  retry: () => void;
  /** Replace one row with a fresh server copy (used after a mutation commits). */
  replaceUser: (updated: UserDto) => void;
  /** Optimistically patch one row's status (used before a mutation resolves). */
  patchUserStatus: (id: string, status: UserDto["status"]) => void;
}

/** Debounce a fast-changing value (search box) before it drives a fetch. */
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export interface UseUserDirectoryOptions {
  fetcher: (query: PageQuery) => Promise<PageResponse<UserDto>>;
  sortOptions: SortOption[];
  fallbackMessage: string;
}

/** Generic, role-agnostic directory engine: server-side search, sort, paging,
 *  with a race guard and retry. Mutations (activate/deactivate) layer on top
 *  via `replaceUser` / `patchUserStatus`. */
export function useUserDirectory({
  fetcher,
  sortOptions,
  fallbackMessage,
}: UseUserDirectoryOptions): UserDirectory {
  const [page, setPage] = useState(0);
  const [search, setSearchValue] = useState("");
  const [sort, setSortValue] = useState(sortOptions[0]?.key ?? "");
  const debouncedSearch = useDebounced(search.trim(), 300);

  const [data, setData] = useState<PageResponse<UserDto> | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [isFetching, setIsFetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Monotonic request id: ignore any response that isn't the latest in-flight
  // fetch, so a slow earlier page can't overwrite a newer one (race guard).
  const requestSeq = useRef(0);
  const hasLoadedOnce = useRef(false);
  const [reloadToken, setReloadToken] = useState(0);

  const sortParam =
    sortOptions.find((o) => o.key === sort)?.param ??
    sortOptions[0]?.param ??
    "";

  useEffect(() => {
    const seq = ++requestSeq.current;

    // State updates live inside the async function (not the effect body) so the
    // initial fetching/loading flags don't trip the synchronous-setState rule;
    // this mirrors the load pattern used elsewhere in the dashboard.
    async function run() {
      setIsFetching(true);
      if (!hasLoadedOnce.current) setPhase("loading");
      try {
        const res = await fetcher({
          search: debouncedSearch || undefined,
          page,
          size: PAGE_SIZE,
          sort: sortParam || undefined,
        });
        if (seq !== requestSeq.current) return;
        setData(res);
        setErrorMessage("");
        setPhase("ready");
        hasLoadedOnce.current = true;
      } catch (err: unknown) {
        if (seq !== requestSeq.current) return;
        // First load failing = full error surface. A later page/search failing
        // keeps the last good page on screen.
        setErrorMessage(getApiErrorMessage(err, fallbackMessage));
        if (!hasLoadedOnce.current) setPhase("error");
      } finally {
        if (seq === requestSeq.current) setIsFetching(false);
      }
    }

    void run();
  }, [fetcher, debouncedSearch, page, sortParam, fallbackMessage, reloadToken]);

  const setSearch = useCallback((value: string) => {
    setSearchValue(value);
    setPage(0); // new query starts from the first page
  }, []);

  const setSort = useCallback((key: string) => {
    setSortValue(key);
    setPage(0);
  }, []);

  const goToPage = useCallback((next: number) => {
    setPage(Math.max(0, next));
  }, []);

  const retry = useCallback(() => {
    hasLoadedOnce.current = false;
    setReloadToken((t) => t + 1);
  }, []);

  const replaceUser = useCallback((updated: UserDto) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            content: prev.content.map((u) =>
              u.id === updated.id ? updated : u,
            ),
          }
        : prev,
    );
  }, []);

  const patchUserStatus = useCallback(
    (id: string, status: UserDto["status"]) => {
      setData((prev) =>
        prev
          ? {
              ...prev,
              content: prev.content.map((u) =>
                u.id === id ? { ...u, status } : u,
              ),
            }
          : prev,
      );
    },
    [],
  );

  return useMemo(
    () => ({
      phase,
      isFetching,
      errorMessage,
      page,
      search,
      sort,
      sortOptions,
      data,
      setSearch,
      setSort,
      goToPage,
      retry,
      replaceUser,
      patchUserStatus,
    }),
    [
      phase,
      isFetching,
      errorMessage,
      page,
      search,
      sort,
      sortOptions,
      data,
      setSearch,
      setSort,
      goToPage,
      retry,
      replaceUser,
      patchUserStatus,
    ],
  );
}
