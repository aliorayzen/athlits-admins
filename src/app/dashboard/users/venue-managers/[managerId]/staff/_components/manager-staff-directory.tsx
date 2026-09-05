"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getApiErrorMessage,
  getVenueManagerStaff,
  updateVenueStaff,
} from "@/lib/api";
import {
  ALL_STAFF_PERMISSIONS,
  STAFF_PERMISSION_GROUPS,
  STAFF_PERMISSION_PRESETS,
} from "@/lib/staff-permissions";
import { cn } from "@/lib/utils";
import type {
  StaffPermission,
  StaffUserDto,
  VenueStaffAccess,
} from "@/types/api";

type LoadPhase = "loading" | "ready" | "error";
type PermissionDraft = Record<string, StaffPermission[]>;

function staffName(staff: StaffUserDto): string {
  return `${staff.firstName ?? ""} ${staff.lastName ?? ""}`.trim() || "Unnamed staff";
}

function staffInitials(staff: StaffUserDto): string {
  return `${staff.firstName?.[0] ?? ""}${staff.lastName?.[0] ?? ""}`.toUpperCase() || "S";
}

function accessKey(access: VenueStaffAccess): string {
  return String(access.venueId);
}

function permissionDraftFor(staff: StaffUserDto): PermissionDraft {
  return Object.fromEntries(
    staff.venueAccess.map((access) => [accessKey(access), [...access.permissions]]),
  );
}

function permissionCount(staff: StaffUserDto): number {
  return staff.venueAccess.reduce(
    (total, access) => total + access.permissions.length,
    0,
  );
}

function matchesSearch(staff: StaffUserDto, query: string): boolean {
  const searchable = [
    staffName(staff),
    staff.email,
    staff.phoneNumber ?? "",
    ...staff.venueAccess.map((access) => access.venueName),
  ]
    .join(" ")
    .toLocaleLowerCase();
  return searchable.includes(query);
}

export function ManagerStaffDirectory({
  managerId,
  venueId,
}: {
  managerId: string;
  venueId?: string;
}) {
  const [staff, setStaff] = useState<StaffUserDto[]>([]);
  const [phase, setPhase] = useState<LoadPhase>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function run() {
      setPhase("loading");
      setErrorMessage("");
      try {
        const result = await getVenueManagerStaff(managerId);
        if (controller.signal.aborted) return;
        setStaff(result);
        setPhase("ready");
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        setErrorMessage(
          getApiErrorMessage(
            error,
            "Couldn't load this manager's staff. Check your connection and try again.",
          ),
        );
        setPhase("error");
      }
    }

    void run();
    return () => controller.abort();
  }, [managerId, reloadToken]);

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return staff.filter((person) => {
      const belongsToVenue =
        !venueId ||
        person.venueAccess.some((access) => accessKey(access) === venueId);
      return belongsToVenue && (!query || matchesSearch(person, query));
    });
  }, [search, staff, venueId]);

  const venueName = useMemo(() => {
    if (!venueId) return null;
    return staff
      .flatMap((person) => person.venueAccess)
      .find((access) => accessKey(access) === venueId)?.venueName;
  }, [staff, venueId]);

  function replaceStaff(updated: StaffUserDto) {
    setStaff((current) =>
      current.map((person) => (person.id === updated.id ? updated : person)),
    );
  }

  function retry() {
    setReloadToken((current) => current + 1);
  }

  return (
    <div className="users-v2 space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/dashboard/users/venue-managers"
            className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-3)] transition-colors hover:text-[var(--text-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-amber-subtle)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Venue managers
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-1)]">
              Venue staff
            </h1>
            {phase === "ready" && (
              <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-1)] px-2 py-[2px] font-mono text-[11px] font-medium tabular-nums text-[var(--text-3)]">
                {filteredStaff.length}
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] text-[var(--text-3)]">
            {venueName ? `${venueName} staff managed by venue manager ` : "Accounts managed by venue manager "}
            <span className="font-mono text-[12px] text-[var(--semantic-amber)]">
              #{managerId}
            </span>
          </p>
        </div>

        <div className="relative w-full sm:max-w-[320px]">
          <Search className="pointer-events-none absolute left-[11px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[var(--text-4)]" />
          <input
            type="search"
            aria-label="Search staff"
            placeholder="Search staff or venue..."
            value={search}
            disabled={phase !== "ready"}
            onChange={(event) => setSearch(event.target.value)}
            className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--bg-1)] pl-[34px] pr-3 text-[12.5px] text-[var(--text-1)] outline-none transition-all placeholder:text-[var(--text-4)] focus:border-[var(--semantic-amber)] focus:shadow-[0_0_0_3px_var(--semantic-amber-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </header>

      {phase === "loading" && <StaffTableSkeleton />}
      {phase === "error" && (
        <LoadError message={errorMessage} onRetry={retry} />
      )}
      {phase === "ready" && filteredStaff.length === 0 && !search.trim() && (
        <EmptyStaff isVenueScoped={Boolean(venueId)} />
      )}
      {phase === "ready" && filteredStaff.length === 0 && search.trim() && (
        <NoSearchResults onClear={() => setSearch("")} />
      )}
      {phase === "ready" && filteredStaff.length > 0 && (
        <StaffTable
          staff={filteredStaff}
          managerId={managerId}
          preferredVenueId={venueId}
          onUpdated={replaceStaff}
        />
      )}
    </div>
  );
}

function StaffTable({
  staff,
  managerId,
  preferredVenueId,
  onUpdated,
}: {
  staff: StaffUserDto[];
  managerId: string;
  preferredVenueId?: string;
  onUpdated: (staff: StaffUserDto) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-separate border-spacing-0">
          <thead className="bg-white/[0.012]">
            <tr>
              <TableHeading className="pl-4">Staff member</TableHeading>
              <TableHeading>Phone</TableHeading>
              <TableHeading>Venue access</TableHeading>
              <TableHeading>Permissions</TableHeading>
              <TableHeading>Status</TableHeading>
              <TableHeading className="pr-4 text-right">Actions</TableHeading>
            </tr>
          </thead>
          <tbody>
            {staff.map((person) => (
              <StaffRow
                key={person.id}
                staff={person}
                managerId={managerId}
                preferredVenueId={preferredVenueId}
                onUpdated={onUpdated}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StaffRow({
  staff,
  managerId,
  preferredVenueId,
  onUpdated,
}: {
  staff: StaffUserDto;
  managerId: string;
  preferredVenueId?: string;
  onUpdated: (staff: StaffUserDto) => void;
}) {
  const primaryVenue = staff.venueAccess[0];
  const otherVenueCount = Math.max(0, staff.venueAccess.length - 1);
  const isActive = staff.status === "ACTIVE";

  return (
    <tr className="group transition-colors hover:bg-white/[0.015]">
      <td className="border-t border-white/[0.035] px-4 py-3 align-middle">
        <div className="flex min-w-[230px] items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[rgba(245,158,11,0.18)] bg-[var(--semantic-amber-subtle)] text-[11px] font-semibold text-[var(--semantic-amber)]">
            {staffInitials(staff)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[13px] font-medium text-[var(--text-1)]">
                {staffName(staff)}
              </p>
              {staff.forcePasswordChange && (
                <span title="Password change required">
                  <KeyRound className="h-3 w-3 shrink-0 text-[var(--semantic-amber)]" />
                </span>
              )}
            </div>
            <p className="mt-0.5 flex items-center gap-1 truncate font-mono text-[10.5px] text-[var(--text-4)]">
              <Mail className="h-3 w-3 shrink-0" />
              {staff.email}
            </p>
          </div>
        </div>
      </td>
      <td className="border-t border-white/[0.035] px-3 py-3 align-middle">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[11px] text-[var(--text-3)]">
          <Phone className="h-3 w-3 text-[var(--text-4)]" />
          {staff.phoneNumber || "Not provided"}
        </span>
      </td>
      <td className="border-t border-white/[0.035] px-3 py-3 align-middle">
        {primaryVenue ? (
          <div className="min-w-[150px]">
            <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-2)]">
              <Building2 className="h-3 w-3 text-[var(--semantic-amber)]" />
              {primaryVenue.venueName}
            </span>
            {otherVenueCount > 0 && (
              <p className="mt-0.5 font-mono text-[10px] text-[var(--text-4)]">
                +{otherVenueCount} more venue{otherVenueCount === 1 ? "" : "s"}
              </p>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-[var(--text-4)]">No venues</span>
        )}
      </td>
      <td className="border-t border-white/[0.035] px-3 py-3 align-middle">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-2)] px-2 py-1 font-mono text-[10.5px] text-[var(--text-3)]">
          <ShieldCheck className="h-3 w-3 text-[var(--semantic-amber)]" />
          {permissionCount(staff)} across {staff.venueAccess.length}
        </span>
      </td>
      <td className="border-t border-white/[0.035] px-3 py-3 align-middle">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10.5px] font-medium",
            isActive
              ? "bg-[var(--semantic-green-subtle)] text-[var(--semantic-green)]"
              : "bg-[var(--semantic-red-subtle)] text-[var(--semantic-red)]",
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {isActive ? "Active" : "Disabled"}
        </span>
      </td>
      <td className="border-t border-white/[0.035] px-4 py-3 text-right align-middle">
        <EditPermissionsDialog
          managerId={managerId}
          staff={staff}
          preferredVenueId={preferredVenueId}
          onUpdated={onUpdated}
        />
      </td>
    </tr>
  );
}

function EditPermissionsDialog({
  managerId,
  staff,
  preferredVenueId,
  onUpdated,
}: {
  managerId: string;
  staff: StaffUserDto;
  preferredVenueId?: string;
  onUpdated: (staff: StaffUserDto) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PermissionDraft>(() => permissionDraftFor(staff));
  const [selectedVenueId, setSelectedVenueId] = useState(
    preferredVenueId ?? (staff.venueAccess[0] ? accessKey(staff.venueAccess[0]) : ""),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const selectedAccess = staff.venueAccess.find(
    (access) => accessKey(access) === selectedVenueId,
  );
  const selectedPermissions = draft[selectedVenueId] ?? [];
  const canSave =
    staff.venueAccess.length > 0 &&
    staff.venueAccess.every((access) => (draft[accessKey(access)] ?? []).length > 0) &&
    !isSaving;

  function handleOpenChange(nextOpen: boolean) {
    if (isSaving) return;
    if (nextOpen) {
      setDraft(permissionDraftFor(staff));
      setSelectedVenueId(
        preferredVenueId ??
          (staff.venueAccess[0] ? accessKey(staff.venueAccess[0]) : ""),
      );
      setSaveError("");
    }
    setOpen(nextOpen);
  }

  function setSelectedPermissions(permissions: StaffPermission[]) {
    setSaveError("");
    setDraft((current) => ({ ...current, [selectedVenueId]: permissions }));
  }

  function togglePermission(permission: StaffPermission, checked: boolean) {
    const nextPermissions = checked
      ? [...new Set([...selectedPermissions, permission])]
      : selectedPermissions.filter((value) => value !== permission);
    setSelectedPermissions(nextPermissions);
  }

  async function savePermissions() {
    if (!canSave) return;
    setIsSaving(true);
    setSaveError("");
    try {
      await updateVenueStaff(managerId, staff.id, {
        venueAssignments: staff.venueAccess.map((access) => ({
          venueId: access.venueId,
          permissions: draft[accessKey(access)] ?? [],
        })),
      });

      const updated = {
        ...staff,
        venueAccess: staff.venueAccess.map((access) => ({
          ...access,
          permissions: draft[accessKey(access)] ?? [],
        })),
      };
      onUpdated(updated);
      setOpen(false);
      toast.success(`Updated permissions for ${staffName(staff)}`);
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        "Couldn't update these permissions. Please try again.",
      );
      setSaveError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={(props) => (
          <button
            {...props}
            type="button"
            disabled={staff.venueAccess.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-[rgba(245,158,11,0.25)] bg-[var(--semantic-amber-subtle)] px-2.5 py-[5px] text-[12px] font-medium text-[var(--semantic-amber)] transition-colors hover:bg-[rgba(245,158,11,0.16)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Pencil className="h-3 w-3" />
            Permissions
          </button>
        )}
      />
      <DialogContent className="max-h-[min(760px,calc(100vh-2rem))] overflow-y-auto border-[var(--border)] bg-[var(--bg-1)] sm:max-w-2xl">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-[16px] text-[var(--text-1)]">
            Edit staff permissions
          </DialogTitle>
          <DialogDescription className="text-[12.5px] text-[var(--text-3)]">
            Update venue access for {staffName(staff)}. Every venue assignment is preserved.
          </DialogDescription>
        </DialogHeader>

        {staff.venueAccess.length > 1 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Venue assignment">
            {staff.venueAccess.map((access) => {
              const key = accessKey(access);
              const isSelected = key === selectedVenueId;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedVenueId(key)}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 text-[11.5px] font-medium transition-colors",
                    isSelected
                      ? "border-[rgba(245,158,11,0.3)] bg-[var(--semantic-amber-subtle)] text-[var(--semantic-amber)]"
                      : "border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-3)] hover:border-[var(--border-strong)] hover:text-[var(--text-1)]",
                  )}
                >
                  {access.venueName}
                </button>
              );
            })}
          </div>
        )}

        {selectedAccess && (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-[var(--semantic-amber)]" />
                <span className="truncate text-[12.5px] font-semibold text-[var(--text-1)]">
                  {selectedAccess.venueName}
                </span>
              </div>
              <span className="shrink-0 font-mono text-[10.5px] text-[var(--text-4)]">
                {selectedPermissions.length} / {ALL_STAFF_PERMISSIONS.length}
              </span>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-1.5">
              {STAFF_PERMISSION_PRESETS.map((preset) => {
                const isActive =
                  preset.permissions.length === selectedPermissions.length &&
                  preset.permissions.every((permission) =>
                    selectedPermissions.includes(permission),
                  );
                return (
                  <button
                    key={preset.label}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setSelectedPermissions([...preset.permissions])}
                    className={cn(
                      "rounded-md border px-2.5 py-2 text-left transition-colors",
                      isActive
                        ? "border-[rgba(245,158,11,0.3)] bg-[var(--semantic-amber-subtle)]"
                        : "border-[var(--border)] bg-[var(--bg-0)] hover:border-[var(--border-strong)]",
                    )}
                  >
                    <span className="block text-[11.5px] font-semibold text-[var(--text-1)]">
                      {preset.label}
                    </span>
                    <span className="mt-0.5 block text-[9.5px] text-[var(--text-4)]">
                      {preset.description}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {STAFF_PERMISSION_GROUPS.map((group) => (
                <fieldset
                  key={group.label}
                  className="rounded-md border border-[var(--border)] bg-[var(--bg-0)] p-3"
                >
                  <legend className="px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
                    {group.label}
                  </legend>
                  <div className="mt-1 space-y-0.5">
                    {group.options.map((option) => (
                      <label
                        key={option.value}
                        className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1.5 transition-colors hover:bg-[var(--bg-2)]"
                        title={option.description}
                      >
                        <Checkbox
                          checked={selectedPermissions.includes(option.value)}
                          onCheckedChange={(checked) =>
                            togglePermission(option.value, checked)
                          }
                          className="data-checked:border-[var(--semantic-amber)] data-checked:bg-[var(--semantic-amber)] data-checked:text-[var(--bg-0)]"
                        />
                        <span className="text-[11.5px] text-[var(--text-2)]">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </div>
        )}

        {!canSave && !isSaving && staff.venueAccess.length > 0 && (
          <p role="alert" className="text-[11px] text-[var(--semantic-red)]">
            Select at least one permission for every venue.
          </p>
        )}
        {saveError && (
          <p
            role="alert"
            className="rounded-md border border-[var(--semantic-red-subtle)] bg-[var(--semantic-red-subtle)] px-3 py-2 text-[11.5px] text-[var(--semantic-red)]"
          >
            {saveError}
          </p>
        )}

        <DialogFooter className="border-[var(--border)] bg-[var(--bg-1)]">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => setOpen(false)}
            className="border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-2)]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            onClick={savePermissions}
            className="gap-1.5 border border-[rgba(245,158,11,0.3)] bg-[var(--semantic-amber)] font-semibold text-[#1a1100] shadow-[0_0_20px_-6px_rgba(245,158,11,0.35)] hover:bg-[var(--semantic-amber)] hover:brightness-105"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {isSaving ? "Saving..." : "Save permissions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StaffTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)]">
      <Skeleton className="h-10 w-full rounded-none" />
      {[0, 1, 2, 3].map((row) => (
        <div
          key={row}
          className="flex items-center gap-4 border-t border-[var(--border)] px-4 py-3"
        >
          <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="ml-auto h-7 w-24" />
        </div>
      ))}
    </div>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-[rgba(244,63,94,0.18)] bg-[var(--bg-1)] px-6 text-center">
      <UserRound className="h-6 w-6 text-[var(--semantic-red)]" />
      <h2 className="mt-3 text-sm font-semibold text-[var(--text-1)]">
        Staff unavailable
      </h2>
      <p className="mt-1 max-w-[52ch] text-xs leading-5 text-[var(--text-3)]">
        {message}
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={onRetry}
        className="mt-4 gap-1.5 border-[var(--border-strong)] bg-[var(--bg-2)] text-[var(--text-2)]"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </Button>
    </div>
  );
}

function EmptyStaff({ isVenueScoped }: { isVenueScoped: boolean }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-1)] px-6 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--semantic-amber-subtle)]">
        <Users className="h-5 w-5 text-[var(--semantic-amber)]" />
      </div>
      <h2 className="mt-3 text-sm font-semibold text-[var(--text-1)]">
        No staff assigned
      </h2>
      <p className="mt-1 max-w-[52ch] text-xs leading-5 text-[var(--text-3)]">
        {isVenueScoped
          ? "Create staff for this venue to give them scoped operational access."
          : "Create staff from a managed venue to give them scoped operational access."}
      </p>
      <Link
        href="/dashboard/venues"
        className="mt-4 text-[12px] font-medium text-[var(--semantic-amber)] hover:underline hover:underline-offset-2"
      >
        Browse venues
      </Link>
    </div>
  );
}

function NoSearchResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-1)] px-6 text-center">
      <Search className="h-5 w-5 text-[var(--text-4)]" />
      <h2 className="mt-3 text-sm font-semibold text-[var(--text-1)]">
        No matching staff
      </h2>
      <p className="mt-1 text-xs text-[var(--text-3)]">
        Try another name, email, phone number, or venue.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-3 text-[12px] font-medium text-[var(--semantic-amber)] hover:underline hover:underline-offset-2"
      >
        Clear search
      </button>
    </div>
  );
}

function TableHeading({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "h-9 px-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]",
        className,
      )}
    >
      {children}
    </th>
  );
}
