"use client";

import { Ban, Loader2, Power } from "lucide-react";

import type { UserDto } from "@/types/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import {
  DirectoryView,
  statusBucket,
} from "../../_components/directory/directory-view";
import { useVenueManagers } from "./use-venue-managers";

const CREATE_HREF = "/dashboard/users/create/venue-manager";

export function VenueManagersDirectory() {
  const vm = useVenueManagers();

  return (
    <DirectoryView
      dir={vm}
      accent="amber"
      title="Venue Managers"
      subtitle="Managers scoped to their assigned venues"
      personLabel="Manager"
      idLabel="Manager ID"
      noun="venue managers"
      searchPlaceholder="Search name or email…"
      emptyTitle="No venue managers yet"
      emptyBody="Create a venue manager to give a venue operator scoped access"
      create={{ href: CREATE_HREF, label: "New venue manager" }}
      renderActions={(manager) => (
        <ManagerAction
          manager={manager}
          isPending={vm.pendingIds.has(manager.id)}
          onToggle={vm.toggleActive}
        />
      )}
    />
  );
}

function ManagerAction({
  manager,
  isPending,
  onToggle,
}: {
  manager: UserDto;
  isPending: boolean;
  onToggle: (m: UserDto) => Promise<void>;
}) {
  const bucket = statusBucket(manager.status);

  // Pending signups can't be toggled — the manager hasn't completed activation.
  if (bucket === "pending") {
    return (
      <span className="font-mono text-[11px] text-[var(--text-4)]">
        Awaiting setup
      </span>
    );
  }

  const isActive = bucket === "active";
  const label = isActive ? "Deactivate" : "Activate";

  async function handleToggle() {
    const verb = isActive ? "Deactivated" : "Activated";
    try {
      await onToggle(manager);
      toast.success(`${verb} ${manager.firstName} ${manager.lastName}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-[5px] text-[12px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60",
        isActive
          ? "border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-3)] hover:border-[rgba(244,63,94,0.3)] hover:bg-[var(--semantic-red-subtle)] hover:text-[var(--semantic-red)]"
          : "border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.08)] text-[var(--semantic-green)] hover:bg-[rgba(16,185,129,0.14)]",
      )}
    >
      {isPending ? (
        <Loader2 className="h-[13px] w-[13px] animate-spin" />
      ) : isActive ? (
        <Ban className="h-[13px] w-[13px]" />
      ) : (
        <Power className="h-[13px] w-[13px]" />
      )}
      {label}
    </button>
  );
}
