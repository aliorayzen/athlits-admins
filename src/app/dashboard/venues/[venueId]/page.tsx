"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  assignManager,
  createContract,
  getActiveContract,
  getApiErrorMessage,
  getApiErrorStatus,
  getContracts,
  getVenue,
  setVenueStatus,
} from "@/lib/api";
import type {
  ContractResponse,
  VenueDetailResponse,
  VenueStatus,
} from "@/types/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  CalendarClock,
  Star,
  Layers,
  Pencil,
  UserPlus,
  FileText,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { ContractTermsEditor } from "@/components/contract-terms-editor";
import {
  contractDraftError,
  contractDraftToPayload,
  defaultContractDraft,
  formatContractFee,
  type ContractDraft,
} from "@/lib/contracts";

const CONTRACT_INPUT_CLASS =
  "border-[var(--border)] bg-[var(--bg-0)] text-white placeholder:text-white/25 focus:border-[var(--teal)]/40 focus:ring-[3px] focus:ring-[var(--teal-subtle)]";
const CONTRACT_LABEL_CLASS =
  "text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-4)]";

export default function VenueDetailPage() {
  const params = useParams<{ venueId: string }>();
  const router = useRouter();
  const [venue, setVenue] = useState<VenueDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [managerId, setManagerId] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [activeContract, setActiveContract] = useState<ContractResponse | null>(
    null,
  );
  const [contractHistory, setContractHistory] = useState<ContractResponse[]>(
    [],
  );
  const [contractsLoading, setContractsLoading] = useState(true);
  const [contractSaving, setContractSaving] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);
  const [contractDraft, setContractDraft] = useState<ContractDraft>(
    defaultContractDraft(),
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getVenue(params.venueId);
        if (cancelled) return;
        setVenue(data);
        setContractDraft(defaultContractDraft(data.currencyCode));
        setContractsLoading(true);
        setContractError(null);
        try {
          const [active, history] = await Promise.all([
            getActiveContract(data.id).catch((err: unknown) => {
              if (getApiErrorStatus(err) === 404) return null;
              throw err;
            }),
            getContracts(data.id),
          ]);
          if (cancelled) return;
          setActiveContract(active);
          setContractHistory(history);
        } catch (err: unknown) {
          if (!cancelled) {
            setContractError(
              getApiErrorMessage(err, "Failed to load venue contracts"),
            );
          }
        }
      } catch {
        if (cancelled) return;
        toast.error("Failed to load venue");
        router.push("/dashboard/venues");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setContractsLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [params.venueId, router]);

  async function handleStatusToggle() {
    if (!venue) return;
    const newStatus: VenueStatus =
      venue.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await setVenueStatus(venue.id, { status: newStatus });
      setVenue({ ...venue, status: newStatus });
      setStatusDialogOpen(false);
      toast.success(
        `Venue ${newStatus === "ACTIVE" ? "activated" : "suspended"}`,
      );
    } catch {
      toast.error("Failed to update venue status");
    }
  }

  async function handleAssignManager() {
    if (!venue || !managerId.trim()) return;
    try {
      await assignManager(venue.id, { managerId: managerId.trim() });
      setVenue({ ...venue, managerId: managerId.trim() });
      setAssignDialogOpen(false);
      setManagerId("");
      toast.success("Manager assigned");
    } catch {
      toast.error("Failed to assign manager");
    }
  }

  function updateContractDraft(patch: Partial<ContractDraft>) {
    setContractError(null);
    setContractDraft((prev) => ({ ...prev, ...patch }));
  }

  async function handleCreateContract() {
    if (!venue || contractSaving) return;
    const validationMessage = contractDraftError(contractDraft);
    if (validationMessage) {
      setContractError(validationMessage);
      return;
    }

    setContractSaving(true);
    setContractError(null);
    try {
      const created = await createContract(
        venue.id,
        contractDraftToPayload(contractDraft),
      );
      setActiveContract(created);
      setContractHistory(await getContracts(venue.id));
      toast.success("Contract terms saved");
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, "Failed to save contract terms");
      setContractError(message);
      toast.error(message);
    } finally {
      setContractSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-80 w-full rounded-2xl lg:col-span-2" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!venue) return null;

  const courts = venue.courts ?? [];
  const courtsLabel =
    venue.courtLimit != null
      ? `${venue.courtCount ?? courts.length} / ${venue.courtLimit}`
      : `${venue.courtCount ?? courts.length}`;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/venues">
            <Button
              variant="ghost"
              size="icon"
              className="text-[var(--text-4)] hover:text-[var(--text-1)]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="truncate text-[26px] font-semibold leading-tight tracking-tight text-[var(--text-1)]">
                {venue.name}
              </h1>
              <Badge
                variant={venue.status === "ACTIVE" ? "default" : "secondary"}
                className={
                  venue.status === "ACTIVE"
                    ? "shrink-0 gap-1.5 bg-[var(--semantic-green-subtle)] text-[var(--semantic-green)]"
                    : "shrink-0 gap-1.5 bg-[var(--semantic-amber-subtle)] text-[var(--semantic-amber)]"
                }
              >
                <span
                  className={
                    venue.status === "ACTIVE"
                      ? "h-1.5 w-1.5 rounded-full bg-[var(--semantic-green)]"
                      : "h-1.5 w-1.5 rounded-full bg-[var(--semantic-amber)]"
                  }
                />
                {venue.status}
              </Badge>
            </div>
            <p className="mt-0.5 truncate font-mono text-xs text-[var(--text-4)]">
              {venue.slug}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {/* Edit */}
          <Link href={`/dashboard/venues/${venue.id}/edit`}>
            <Button
              variant="outline"
              className="border-[var(--border-strong)] bg-[var(--bg-2)] text-[var(--text-2)] hover:bg-[var(--bg-hover)]"
            >
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>

          {/* Assign Manager */}
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogTrigger
              render={(props) => (
                <Button
                  {...props}
                  variant="outline"
                  className="border-[var(--border-strong)] bg-[var(--bg-2)] text-[var(--text-2)] hover:bg-[var(--bg-hover)]"
                >
                  <UserPlus className="mr-2 h-3.5 w-3.5" />
                  Assign Manager
                </Button>
              )}
            />
            <DialogContent className="border-[var(--border)] bg-[var(--bg-1)]">
              <DialogHeader>
                <DialogTitle>Assign Venue Manager</DialogTitle>
                <DialogDescription className="text-[var(--text-3)]">
                  Enter the ID of the venue manager to assign to {venue.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-4">
                <Label className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-4)]">
                  Manager ID
                </Label>
                <Input
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  placeholder="Enter venue manager UUID"
                  className="border-[var(--border)] bg-[var(--bg-0)] font-mono text-white placeholder:text-white/25 focus:border-[var(--teal)]/40"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAssignDialogOpen(false)}
                  className="border-[var(--border-strong)] bg-[var(--bg-2)] text-[var(--text-2)]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignManager}
                  disabled={!managerId.trim()}
                  className="bg-[linear-gradient(135deg,var(--teal),#00b894)] font-semibold text-[#060a0e] shadow-[0_1px_12px_-2px_var(--teal-glow)] hover:-translate-y-px hover:brightness-110"
                >
                  Assign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Status toggle */}
          <AlertDialog
            open={statusDialogOpen}
            onOpenChange={setStatusDialogOpen}
          >
            <AlertDialogTrigger
              render={(props) => (
                <Button
                  {...props}
                  className={
                    venue.status === "ACTIVE"
                      ? "border-[var(--border-strong)] bg-[var(--bg-2)] text-[var(--semantic-amber)] hover:bg-[var(--semantic-amber-subtle)]"
                      : "bg-[linear-gradient(135deg,var(--teal),#00b894)] font-semibold text-[#060a0e] shadow-[0_1px_12px_-2px_var(--teal-glow)] hover:-translate-y-px hover:brightness-110"
                  }
                  variant={venue.status === "ACTIVE" ? "outline" : "default"}
                >
                  {venue.status === "ACTIVE" ? "Suspend" : "Activate"}
                </Button>
              )}
            />
            <AlertDialogContent className="border-[var(--border)] bg-[var(--bg-1)]">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {venue.status === "ACTIVE" ? "Suspend" : "Activate"}{" "}
                  {venue.name}?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[var(--text-3)]">
                  {venue.status === "ACTIVE"
                    ? "Suspending this venue will prevent new bookings."
                    : "Activating this venue will allow customers to book again."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-[var(--border-strong)] bg-[var(--bg-2)] text-[var(--text-2)]">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleStatusToggle}
                  className={
                    venue.status === "ACTIVE"
                      ? "bg-[var(--semantic-amber-subtle)] text-[var(--semantic-amber)] hover:bg-[rgba(245,158,11,0.2)]"
                      : "bg-[linear-gradient(135deg,var(--teal),#00b894)] text-[var(--bg-0)] hover:brightness-110"
                  }
                >
                  {venue.status === "ACTIVE" ? "Suspend" : "Activate"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Optional description */}
      {venue.description && (
        <p className="max-w-[70ch] text-sm leading-relaxed text-[var(--text-3)]">
          {venue.description}
        </p>
      )}

      {/* Facts strip — dense, hugs content, only renders what exists */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg-1)] px-5 py-4 sm:grid-cols-3 lg:grid-cols-4">
        <Fact icon={MapPin} label="Location">
          {venue.addressLine}, {venue.city}
        </Fact>
        <Fact icon={Globe} label="Region" mono>
          {venue.countryCode} · {venue.currencyCode}
        </Fact>
        {venue.contactPhone && (
          <Fact icon={Phone} label="Phone" mono>
            {venue.contactPhone}
          </Fact>
        )}
        {venue.contactEmail && (
          <Fact icon={Mail} label="Email" mono>
            {venue.contactEmail}
          </Fact>
        )}
        {venue.timeZoneId && (
          <Fact icon={Clock} label="Timezone">
            {venue.timeZoneId}
          </Fact>
        )}
        <Fact icon={CalendarClock} label="Advance booking">
          {venue.maxAdvanceBookingDays} days
        </Fact>
        {venue.venueRating != null && (
          <Fact icon={Star} label="Rating" mono>
            {venue.venueRating.toFixed(1)}
          </Fact>
        )}
        <Fact icon={Layers} label="Courts" mono>
          {courtsLabel}
        </Fact>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Contract Terms — primary operation, full room */}
        <section className="lg:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]">
          <header className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--teal-subtle)] ring-1 ring-[var(--teal-subtle)]">
              <FileText className="h-4 w-4 text-[var(--teal-text)]" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--text-1)]">
                Contract Terms
              </h2>
              <p className="text-xs text-[var(--text-4)]">
                Billing terms the venue manager is invoiced against
              </p>
            </div>
          </header>

          <div className="space-y-5 px-5 py-5">
            {contractsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-40 w-full rounded-lg" />
              </div>
            ) : (
              <>
                {/* Active contract status banner */}
                {activeContract ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--semantic-green-subtle)] bg-[var(--semantic-green-subtle)] px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--semantic-green)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--semantic-green)]" />
                        Active contract
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[var(--text-1)]">
                        {formatContractFee(activeContract)}
                      </div>
                    </div>
                    <div className="font-mono text-[11px] leading-4 text-[var(--text-3)]">
                      {activeContract.startDate} →{" "}
                      {activeContract.endDate ?? "open-ended"}
                      <br />
                      {activeContract.gracePeriodDays} grace days
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-[var(--semantic-amber-subtle)] bg-[var(--semantic-amber-subtle)] px-4 py-3 text-[12.5px] leading-5 text-[var(--semantic-amber)]">
                    No active contract. Venue-manager finance endpoints return
                    404 until one is created.
                  </div>
                )}

                <ContractTermsEditor
                  draft={contractDraft}
                  onChange={updateContractDraft}
                  inputClassName={CONTRACT_INPUT_CLASS}
                  labelClassName={CONTRACT_LABEL_CLASS}
                  disabled={contractSaving}
                />

                {contractError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-[rgba(244,63,94,0.24)] bg-[rgba(244,63,94,0.08)] px-3 py-2.5 text-[12.5px] leading-5 text-[var(--semantic-red)]"
                  >
                    {contractError}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                  <span className="font-mono text-[11px] text-[var(--text-4)]">
                    {contractHistory.length} contract
                    {contractHistory.length === 1 ? "" : "s"} in history
                  </span>
                  <Button
                    type="button"
                    onClick={handleCreateContract}
                    disabled={contractSaving}
                    className="bg-[linear-gradient(135deg,var(--teal),#00b894)] font-semibold text-[#060a0e] shadow-[0_1px_12px_-2px_var(--teal-glow)] hover:-translate-y-px hover:brightness-110"
                  >
                    {contractSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : activeContract ? (
                      "Replace Active"
                    ) : (
                      "Create Contract"
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Configuration + Manager — compact side panel */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]">
          <header className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-[15px] font-semibold text-[var(--text-1)]">
              Configuration
            </h2>
            <p className="text-xs text-[var(--text-4)]">
              Booking behavior &amp; ownership
            </p>
          </header>
          <div className="divide-y divide-[var(--border)]">
            <ConfigRow label="Auto confirm">
              <BoolBadge on={venue.autoConfirmation} />
            </ConfigRow>
            <ConfigRow label="Recurring bookings">
              <BoolBadge on={venue.allowRecurringBookings} />
            </ConfigRow>
            <ConfigRow label="Manager">
              {venue.managerId ? (
                <span className="rounded-md bg-[var(--bg-2)] px-2 py-0.5 font-mono text-xs text-[var(--text-2)]">
                  {venue.managerId.slice(0, 8)}
                </span>
              ) : (
                <span className="text-xs text-[var(--text-4)]">Unassigned</span>
              )}
            </ConfigRow>
          </div>

          {venue.facilities.length > 0 && (
            <div className="border-t border-[var(--border)] px-5 py-4">
              <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-4)]">
                Facilities
              </p>
              <div className="flex flex-wrap gap-1.5">
                {venue.facilities.map((f) => (
                  <span
                    key={f}
                    className="rounded-md border border-[var(--border)] bg-[var(--bg-2)] px-2 py-0.5 text-xs text-[var(--text-3)]"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Courts — full width */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-1)]">
        <header className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-2)]">
            <Layers className="h-4 w-4 text-[var(--text-3)]" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--text-1)]">
              Courts
            </h2>
            <p className="text-xs text-[var(--text-4)]">
              {courts.length} court{courts.length === 1 ? "" : "s"} registered
              &middot; managed by venue managers
            </p>
          </div>
        </header>
        <div className="px-5 py-5">
          {courts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] py-10 text-center">
              <Layers className="h-5 w-5 text-[var(--text-4)]" />
              <p className="text-sm text-[var(--text-3)]">No courts yet</p>
              <p className="text-xs text-[var(--text-4)]">
                Courts appear here once a venue manager adds them.
              </p>
            </div>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {courts.map((court) => (
                <div
                  key={court.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-0)] px-3.5 py-3 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-1)]">
                      {court.name}
                    </p>
                    <p className="truncate text-xs text-[var(--text-4)]">
                      {court.surfaceType} &middot; {court.environment}
                    </p>
                  </div>
                  <BoolBadge
                    on={court.active}
                    onLabel="Active"
                    offLabel="Inactive"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  mono,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-4)]">
        <Icon className="h-3 w-3 text-[var(--teal-text)]/60" />
        {label}
      </div>
      <div
        className={
          mono
            ? "mt-1 truncate font-mono text-[13px] text-[var(--text-2)]"
            : "mt-1 truncate text-[13.5px] text-[var(--text-2)]"
        }
      >
        {children}
      </div>
    </div>
  );
}

function ConfigRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-sm text-[var(--text-3)]">{label}</span>
      {children}
    </div>
  );
}

function BoolBadge({
  on,
  onLabel = "Yes",
  offLabel = "No",
}: {
  on: boolean;
  onLabel?: string;
  offLabel?: string;
}) {
  return (
    <span
      className={
        on
          ? "rounded-md bg-[var(--semantic-green-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--semantic-green)]"
          : "rounded-md bg-[var(--bg-2)] px-2 py-0.5 text-xs font-medium text-[var(--text-4)]"
      }
    >
      {on ? onLabel : offLabel}
    </span>
  );
}
