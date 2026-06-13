"use client";

import { getCustomers } from "@/lib/api";

import { DirectoryView } from "../../_components/directory/directory-view";
import {
  useUserDirectory,
  type SortOption,
} from "../../_components/directory/use-user-directory";

const SORT_OPTIONS: SortOption[] = [
  { key: "name", label: "Name", param: "firstName,asc" },
  { key: "status", label: "Status", param: "status,asc" },
];

const FETCH_FALLBACK =
  "Couldn't load players. Check your connection and try again.";

/** Read-only directory of customers (players). Admins don't create or toggle
 *  customers, so there's no create button and no per-row actions. */
export function PlayersDirectory() {
  const dir = useUserDirectory({
    fetcher: getCustomers,
    sortOptions: SORT_OPTIONS,
    fallbackMessage: FETCH_FALLBACK,
  });

  return (
    <DirectoryView
      dir={dir}
      accent="blue"
      title="Players"
      subtitle="End customers who book and play at venues"
      personLabel="Player"
      idLabel="Player ID"
      noun="players"
      searchPlaceholder="Search name or email…"
      emptyTitle="No players yet"
      emptyBody="Players appear here once customers sign up and book on the platform"
    />
  );
}
