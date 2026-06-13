"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getVenue, setVenueStatus, assignManager } from "@/lib/api";
import type { VenueDetailResponse, VenueStatus } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Calendar,
  Pencil,
  UserPlus,
  Shield,
  Layers,
} from "lucide-react";
import Link from "next/link";

export default function VenueDetailPage() {
  const params = useParams<{ venueId: string }>();
  const router = useRouter();
  const [venue, setVenue] = useState<VenueDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [managerId, setManagerId] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getVenue(params.venueId);
        setVenue(data);
      } catch {
        toast.error("Failed to load venue");
        router.push("/dashboard/venues");
      } finally {
        setIsLoading(false);
      }
    }
    load();
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

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!venue) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {venue.name}
              </h1>
              <Badge
                variant={venue.status === "ACTIVE" ? "default" : "secondary"}
                className={
                  venue.status === "ACTIVE"
                    ? "bg-[var(--semantic-green-subtle)] text-[var(--semantic-green)]"
                    : "bg-[var(--semantic-amber-subtle)] text-[var(--semantic-amber)]"
                }
              >
                {venue.status}
              </Badge>
            </div>
            <p className="font-mono text-sm text-[var(--text-4)]">
              {venue.slug}
            </p>
          </div>
        </div>
        <div className="flex gap-2.5">
          {/* Edit */}
          <Link href={`/dashboard/venues/${venue.id}/edit`}>
            <Button
              variant="outline"
              size="lg"
              className="bg-[var(--bg-2)] border-[var(--border-strong)] text-[var(--text-2)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
            >
              <Pencil className="mr-2 h-4 w-4" />
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
                  size="lg"
                  className="bg-[var(--bg-2)] border-[var(--border-strong)] text-[var(--text-2)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
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
                <Label className="text-xs font-medium uppercase tracking-wider text-[var(--text-3)]">
                  Manager ID
                </Label>
                <Input
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  placeholder="Enter venue manager UUID"
                  className="border-[var(--border)] bg-[var(--bg-hover)] text-white placeholder:text-white/25 focus:border-[var(--teal)]/40"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAssignDialogOpen(false)}
                  className="bg-[var(--bg-2)] border-[var(--border-strong)] text-[var(--text-2)]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignManager}
                  disabled={!managerId.trim()}
                  className="bg-[linear-gradient(135deg,var(--teal),#00b894)] text-[#060a0e] font-semibold shadow-[0_1px_12px_-2px_var(--teal-glow)] hover:-translate-y-px hover:brightness-110"
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
                  size="lg"
                  className={
                    venue.status === "ACTIVE"
                      ? "bg-[var(--bg-2)] border-[var(--border-strong)] text-[var(--semantic-amber)] hover:bg-[var(--semantic-amber-subtle)]"
                      : "bg-[linear-gradient(135deg,var(--teal),#00b894)] text-[#060a0e] font-semibold shadow-[0_1px_12px_-2px_var(--teal-glow)] hover:-translate-y-px hover:brightness-110"
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <Card className="border-[var(--border)] bg-white/[0.03] backdrop-blur-sm lg:col-span-2 hover:border-[var(--border-strong)] hover:shadow-[0_2px_16px_-4px_rgba(0,0,0,0.3)] transition-all">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--teal-subtle)] to-[var(--teal-subtle)]/50 ring-1 ring-[var(--teal-subtle)]">
                <MapPin className="h-4 w-4 text-[var(--teal-text)]" />
              </div>
              <CardTitle className="text-base">Venue Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {venue.description && (
              <p className="text-sm text-[var(--text-3)]">
                {venue.description}
              </p>
            )}

            <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2.5 rounded-lg border border-[var(--bg-hover)] bg-white/[0.02] p-3 text-sm">
                <MapPin className="h-4 w-4 text-[var(--teal-text)]/60" />
                <span className="text-[var(--text-2)]">
                  {venue.addressLine}, {venue.city}
                </span>
              </div>
              {venue.contactPhone && (
                <div className="flex items-center gap-2.5 rounded-lg border border-[var(--bg-hover)] bg-white/[0.02] p-3 text-sm">
                  <Phone className="h-4 w-4 text-[var(--teal-text)]/60" />
                  <span className="text-[var(--text-2)]">
                    {venue.contactPhone}
                  </span>
                </div>
              )}
              {venue.contactEmail && (
                <div className="flex items-center gap-2.5 rounded-lg border border-[var(--bg-hover)] bg-white/[0.02] p-3 text-sm">
                  <Mail className="h-4 w-4 text-[var(--teal-text)]/60" />
                  <span className="text-[var(--text-2)]">
                    {venue.contactEmail}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2.5 rounded-lg border border-[var(--bg-hover)] bg-white/[0.02] p-3 text-sm">
                <Globe className="h-4 w-4 text-[var(--teal-text)]/60" />
                <span className="text-[var(--text-2)]">
                  {venue.countryCode} &middot; {venue.currencyCode}
                </span>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-[var(--bg-hover)] bg-white/[0.02] p-3 text-sm">
                <Calendar className="h-4 w-4 text-[var(--teal-text)]/60" />
                <span className="text-[var(--text-2)]">
                  Max {venue.maxAdvanceBookingDays} days advance
                </span>
              </div>
            </div>

            {venue.facilities.length > 0 && (
              <>
                <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-4)]">
                    Facilities
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {venue.facilities.map((f) => (
                      <Badge
                        key={f}
                        variant="secondary"
                        className="border-[var(--border)] bg-[var(--bg-hover)] text-xs text-[var(--text-3)]"
                      >
                        {f}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Side info */}
        <div className="space-y-4">
          <Card className="border-[var(--border)] bg-white/[0.03] backdrop-blur-sm hover:border-[var(--border-strong)] hover:shadow-[0_2px_16px_-4px_rgba(0,0,0,0.3)] transition-all">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-hover)]">
                  <Shield className="h-4 w-4 text-[var(--text-4)]" />
                </div>
                <CardTitle className="text-base">Configuration</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <div className="flex justify-between rounded-lg border border-[var(--bg-hover)] bg-white/[0.02] p-3">
                <span className="text-[var(--text-3)]">Auto Confirm</span>
                <Badge
                  variant={venue.autoConfirmation ? "default" : "secondary"}
                  className={
                    venue.autoConfirmation
                      ? "bg-[var(--semantic-green-subtle)] text-[var(--semantic-green)]"
                      : "bg-[var(--border)] text-[var(--text-4)]"
                  }
                >
                  {venue.autoConfirmation ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex justify-between rounded-lg border border-[var(--bg-hover)] bg-white/[0.02] p-3">
                <span className="text-[var(--text-3)]">Recurring</span>
                <Badge
                  variant={
                    venue.allowRecurringBookings ? "default" : "secondary"
                  }
                  className={
                    venue.allowRecurringBookings
                      ? "bg-[var(--semantic-green-subtle)] text-[var(--semantic-green)]"
                      : "bg-[var(--border)] text-[var(--text-4)]"
                  }
                >
                  {venue.allowRecurringBookings ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex justify-between rounded-lg border border-[var(--bg-hover)] bg-white/[0.02] p-3">
                <span className="text-[var(--text-3)]">Manager</span>
                <span className="rounded-md bg-[var(--bg-hover)] px-2 py-0.5 font-mono text-xs text-[var(--text-3)]">
                  {venue.managerId?.slice(0, 8) ?? "Unassigned"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--border)] bg-white/[0.03] backdrop-blur-sm hover:border-[var(--border-strong)] hover:shadow-[0_2px_16px_-4px_rgba(0,0,0,0.3)] transition-all">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-hover)]">
                  <Layers className="h-4 w-4 text-[var(--text-4)]" />
                </div>
                <div>
                  <CardTitle className="text-base">Courts</CardTitle>
                  <CardDescription className="text-[var(--text-4)]">
                    {venue.courts?.length ?? 0} court(s) registered
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!venue.courts || venue.courts.length === 0 ? (
                <p className="text-sm text-[var(--text-4)]">
                  No courts added yet. Courts are managed by venue managers.
                </p>
              ) : (
                <div className="space-y-2">
                  {venue.courts.map((court) => (
                    <div
                      key={court.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-white/[0.02] p-3 transition-colors hover:bg-[var(--bg-hover)]"
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--text-1)]">
                          {court.name}
                        </p>
                        <p className="text-xs text-[var(--text-4)]">
                          {court.surfaceType} &middot; {court.environment}
                        </p>
                      </div>
                      <Badge
                        variant={court.active ? "default" : "secondary"}
                        className={
                          court.active
                            ? "bg-[var(--semantic-green-subtle)] text-[var(--semantic-green)]"
                            : "bg-[var(--border)] text-[var(--text-4)]"
                        }
                      >
                        {court.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
