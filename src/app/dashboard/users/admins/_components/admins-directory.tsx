"use client";

import { getAdmins } from "@/lib/api";

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
  "Couldn't load admins. Check your connection and try again.";

export function AdminsDirectory() {
  const dir = useUserDirectory({
    fetcher: getAdmins,
    sortOptions: SORT_OPTIONS,
    fallbackMessage: FETCH_FALLBACK,
  });

  return (
    <DirectoryView
      dir={dir}
      accent="teal"
      title="Admins"
      subtitle="Team members with full platform access"
      personLabel="Admin"
      idLabel="Admin ID"
      noun="admins"
      searchPlaceholder="Search name or email..."
      emptyTitle="No admins yet"
      emptyBody="Create an admin to give a teammate full platform access"
      create={{ href: "/dashboard/users/create/admin", label: "New admin" }}
    />
  );
}
