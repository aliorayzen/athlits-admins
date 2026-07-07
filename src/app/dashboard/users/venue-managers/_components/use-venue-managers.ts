"use client";

import { useCallback, useMemo, useState } from "react";
import {
  activateVenueManager,
  deactivateVenueManager,
  getApiErrorMessage,
  getVenueManagers,
  updateVenueManager,
} from "@/lib/api";
import type { UpdateVenueManagerRequest, UserDto } from "@/types/api";
import {
  useUserDirectory,
  type SortOption,
  type UserDirectory,
} from "../../_components/directory/use-user-directory";

const SORT_OPTIONS: SortOption[] = [
  { key: "name", label: "Name", param: "firstName,asc" },
  { key: "status", label: "Status", param: "status,asc" },
];

const FETCH_FALLBACK =
  "Couldn't load venue managers. Check your connection and try again.";
const ACTION_FALLBACK = "Couldn't update this manager. Please try again.";

export interface VenueManagersState extends UserDirectory {
  /** Managers with an activate/deactivate request in flight. */
  pendingIds: ReadonlySet<string>;
  /** Toggle ACTIVE↔DISABLED, optimistic with rollback. Throws on failure. */
  toggleActive: (manager: UserDto) => Promise<void>;
  updateDetails: (
    managerId: string,
    payload: UpdateVenueManagerRequest,
  ) => Promise<UserDto>;
}

/** Venue-manager directory: the generic engine plus the VM-only activate /
 *  deactivate mutation layered on top of its optimistic helpers. */
export function useVenueManagers(): VenueManagersState {
  const dir = useUserDirectory({
    fetcher: getVenueManagers,
    sortOptions: SORT_OPTIONS,
    fallbackMessage: FETCH_FALLBACK,
  });

  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const toggleActive = useCallback(
    async (manager: UserDto) => {
      const nextStatus: UserDto["status"] =
        manager.status === "ACTIVE" ? "DISABLED" : "ACTIVE";

      setPendingIds((prev) => new Set(prev).add(manager.id));
      dir.patchUserStatus(manager.id, nextStatus); // optimistic

      try {
        const updated =
          nextStatus === "ACTIVE"
            ? await activateVenueManager(manager.id)
            : await deactivateVenueManager(manager.id);
        dir.replaceUser(updated);
      } catch (err: unknown) {
        dir.patchUserStatus(manager.id, manager.status); // rollback
        throw new Error(getApiErrorMessage(err, ACTION_FALLBACK));
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(manager.id);
          return next;
        });
      }
    },
    [dir],
  );

  const updateDetails = useCallback(
    async (managerId: string, payload: UpdateVenueManagerRequest) => {
      setPendingIds((prev) => new Set(prev).add(managerId));
      try {
        const updated = await updateVenueManager(managerId, payload);
        dir.replaceUser(updated);
        return updated;
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(managerId);
          return next;
        });
      }
    },
    [dir],
  );

  return useMemo(
    () => ({ ...dir, pendingIds, toggleActive, updateDetails }),
    [dir, pendingIds, toggleActive, updateDetails],
  );
}
