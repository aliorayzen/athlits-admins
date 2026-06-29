"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getApiErrorMessage, getEditableVenue, updateVenue } from "@/lib/api";
import type {
  Facility,
  UpdateVenueRequest,
  VenueAvailabilityDay,
} from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PhoneNumberField } from "@/components/phone-number-field";
import { Textarea } from "@/components/ui/textarea";
import {
  availabilityDaysFromUtc,
  availabilityDaysToUtc,
  availabilityDaysWithErrors,
  VenueAvailabilityEditor,
} from "@/components/venue-availability-editor";
import { VenueLocationFields } from "@/components/venue-location-fields";
import {
  DEFAULT_COUNTRY_CODE,
  normalizePhoneForSubmit,
  phoneValueForCountry,
} from "@/lib/phone";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Clock,
  Loader2,
  MapPin,
  Settings,
} from "lucide-react";
import Link from "next/link";

const FACILITIES: { value: Facility; label: string }[] = [
  { value: "PARKING", label: "Parking" },
  { value: "WIFI", label: "Wi-Fi" },
  { value: "SHOWERS", label: "Showers" },
  { value: "LOCKERS", label: "Lockers" },
  { value: "CHANGING_ROOMS", label: "Changing rooms" },
  { value: "CAFETERIA", label: "Cafeteria" },
  { value: "STORES", label: "Stores" },
  { value: "LIGHTING", label: "Lighting" },
  { value: "SEATING", label: "Seating" },
];

const INPUT_CLASS =
  "border-[var(--border)] bg-[var(--bg-hover)] text-white placeholder:text-white/25 focus:border-[rgba(0,212,170,0.3)] focus:shadow-[0_0_0_3px_rgba(0,212,170,0.06)]";

const LABEL_CLASS =
  "text-xs font-medium uppercase tracking-wider text-[var(--text-3)]";

// Local form shape: the subset of UpdateVenueRequest the form edits, with
// non-optional working values so inputs stay controlled.
interface EditForm {
  nameEn: string;
  nameAr: string;
  description: string;
  addressLine: string;
  city: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  contactPhone: string;
  contactEmail: string;
  allowRecurringBookings: boolean;
  maxAdvanceBookingDays: number;
  facilities: Facility[];
  availabilityDays: VenueAvailabilityDay[];
}

type LoadState = "loading" | "ready" | "error";

export default function EditVenuePage() {
  const params = useParams<{ venueId: string }>();
  const router = useRouter();

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [venueName, setVenueName] = useState("");
  const [form, setForm] = useState<EditForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    getEditableVenue(params.venueId)
      .then((venue) => {
        if (cancelled) return;
        setVenueName(venue.name);
        setForm({
          nameEn: venue.nameEn ?? "",
          nameAr: venue.nameAr ?? "",
          description: venue.description ?? "",
          addressLine: venue.addressLine,
          city: venue.city,
          countryCode: venue.countryCode || DEFAULT_COUNTRY_CODE,
          latitude: venue.latitude,
          longitude: venue.longitude,
          contactPhone: venue.contactPhone ?? "",
          contactEmail: venue.contactEmail ?? "",
          allowRecurringBookings: venue.allowRecurringBookings,
          maxAdvanceBookingDays: venue.maxAdvanceBookingDays,
          facilities: venue.facilities ?? [],
          // Backend stores availability in UTC; the form edits local time.
          availabilityDays: availabilityDaysFromUtc(
            venue.availability?.days ?? [],
          ),
        });
        setLoadState("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSubmitError(getApiErrorMessage(err, "Failed to load venue"));
        setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [params.venueId]);

  function updateField<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function updateCountryCode(countryCode: string) {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            countryCode,
            contactPhone: phoneValueForCountry(prev.contactPhone, countryCode),
          }
        : prev,
    );
  }

  function toggleFacility(facility: Facility) {
    setForm((prev) => {
      if (!prev) return prev;
      const has = prev.facilities.includes(facility);
      return {
        ...prev,
        facilities: has
          ? prev.facilities.filter((f) => f !== facility)
          : [...prev.facilities, facility],
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSubmitError(null);

    if (!form.nameEn.trim()) {
      setSubmitError("Enter the venue's English name.");
      return;
    }
    if (!form.nameAr.trim()) {
      setSubmitError("Enter the venue's Arabic name.");
      return;
    }

    if (availabilityDaysWithErrors(form.availabilityDays).length > 0) {
      setSubmitError(
        "Fix the operating hours: every open day needs a closing time after its opening time.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const payload: UpdateVenueRequest = {
        nameEn: form.nameEn.trim(),
        nameAr: form.nameAr.trim(),
        description: form.description.trim() || undefined,
        addressLine: form.addressLine.trim(),
        city: form.city.trim(),
        countryCode: form.countryCode.trim().toUpperCase(),
        latitude: form.latitude,
        longitude: form.longitude,
        contactPhone:
          normalizePhoneForSubmit(form.contactPhone, form.countryCode) ??
          undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        allowRecurringBookings: form.allowRecurringBookings,
        maxAdvanceBookingDays: form.maxAdvanceBookingDays,
        facilities: form.facilities,
        // Backend rejects an availability object with zero days; omit instead.
        // Times are entered in local time and stored in UTC.
        availability:
          form.availabilityDays.length > 0
            ? { days: availabilityDaysToUtc(form.availabilityDays) }
            : undefined,
      };
      const updated = await updateVenue(params.venueId, payload);
      toast.success(`Venue "${updated.name}" updated`);
      router.push(`/dashboard/venues/${params.venueId}`);
    } catch (err: unknown) {
      setSubmitError(getApiErrorMessage(err, "Failed to update venue"));
      toast.error("Failed to update venue");
    } finally {
      setIsSaving(false);
    }
  }

  if (loadState === "loading") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
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

  if (loadState === "error" || !form) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/venues/${params.venueId}`}>
            <Button
              variant="ghost"
              size="icon"
              className="text-[var(--text-4)] hover:text-[var(--text-1)]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Edit Venue</h1>
        </div>
        <div
          role="alert"
          className="flex gap-3 rounded-lg border border-[rgba(244,63,94,0.24)] bg-[rgba(244,63,94,0.08)] px-4 py-3 text-[13px] leading-6"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--semantic-red)]" />
          <div>
            <p className="font-medium text-[var(--semantic-red)]">
              Couldn&apos;t load this venue for editing
            </p>
            <p className="mt-0.5 text-[var(--text-3)]">
              {submitError ?? "Try again, or return to the venue."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/venues/${params.venueId}`}>
          <Button
            variant="ghost"
            size="icon"
            className="text-[var(--text-4)] hover:text-[var(--text-1)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit Venue</h1>
          <p className="text-sm text-[var(--text-3)]">
            Updating{" "}
            <span className="font-medium text-[var(--text-2)]">
              {venueName}
            </span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="border-[var(--border)] bg-[var(--bg-1)] backdrop-blur-sm transition-all hover:border-[var(--border-strong)] hover:shadow-[0_2px_16px_-4px_rgba(0,0,0,0.3)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--teal-subtle)] to-[var(--teal-subtle)] ring-1 ring-[var(--teal-subtle)]">
                <Building2 className="h-4 w-4 text-[var(--teal-text)]" />
              </div>
              <div>
                <CardTitle className="text-base">Basic Information</CardTitle>
                <CardDescription className="text-[var(--text-4)]">
                  Name, description, and contact details
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nameEn" className={LABEL_CLASS}>
                  Venue Name (English) *
                </Label>
                <Input
                  id="nameEn"
                  value={form.nameEn}
                  onChange={(e) => updateField("nameEn", e.target.value)}
                  placeholder="e.g. Arena Sports Complex"
                  required
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameAr" className={LABEL_CLASS}>
                  Venue Name (Arabic) *
                </Label>
                <Input
                  id="nameAr"
                  dir="rtl"
                  lang="ar"
                  value={form.nameAr}
                  onChange={(e) => updateField("nameAr", e.target.value)}
                  placeholder="مثال: مجمّع الأرينا الرياضي"
                  required
                  className={INPUT_CLASS}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className={LABEL_CLASS}>
                Description
              </Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Brief description of the venue"
                rows={3}
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail" className={LABEL_CLASS}>
                Contact Email
              </Label>
              <Input
                id="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={(e) => updateField("contactEmail", e.target.value)}
                placeholder="venue@example.com"
                className={INPUT_CLASS}
              />
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="border-[var(--border)] bg-[var(--bg-1)] backdrop-blur-sm transition-all hover:border-[var(--border-strong)] hover:shadow-[0_2px_16px_-4px_rgba(0,0,0,0.3)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--teal-subtle)] to-[var(--teal-subtle)] ring-1 ring-[var(--teal-subtle)]">
                <MapPin className="h-4 w-4 text-[var(--teal-text)]" />
              </div>
              <div>
                <CardTitle className="text-base">Location</CardTitle>
                <CardDescription className="text-[var(--text-4)]">
                  Address and coordinates
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
            <div className="space-y-2">
              <Label htmlFor="addressLine" className={LABEL_CLASS}>
                Address *
              </Label>
              <Input
                id="addressLine"
                value={form.addressLine}
                onChange={(e) => updateField("addressLine", e.target.value)}
                placeholder="Full street address"
                required
                className={INPUT_CLASS}
              />
            </div>
            <VenueLocationFields
              city={form.city}
              latitude={form.latitude}
              longitude={form.longitude}
              onCityChange={(city) => updateField("city", city)}
              onCoordinatesChange={({ latitude, longitude }) =>
                setForm((prev) =>
                  prev ? { ...prev, latitude, longitude } : prev,
                )
              }
              inputClassName={INPUT_CLASS}
              labelClassName={LABEL_CLASS}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <PhoneNumberField
                countryCode={form.countryCode}
                phoneNumber={form.contactPhone}
                onCountryCodeChange={updateCountryCode}
                onPhoneNumberChange={(value) =>
                  updateField("contactPhone", value)
                }
                phoneLabel="Contact phone"
                inputClassName={INPUT_CLASS}
                labelClassName={LABEL_CLASS}
              />
            </div>
          </CardContent>
        </Card>

        {/* Operating hours */}
        <Card className="border-[var(--border)] bg-[var(--bg-1)] backdrop-blur-sm transition-all hover:border-[var(--border-strong)] hover:shadow-[0_2px_16px_-4px_rgba(0,0,0,0.3)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--teal-subtle)] to-[var(--teal-subtle)] ring-1 ring-[var(--teal-subtle)]">
                <Clock className="h-4 w-4 text-[var(--teal-text)]" />
              </div>
              <div>
                <CardTitle className="text-base">Operating Hours</CardTitle>
                <CardDescription className="text-[var(--text-4)]">
                  When the venue accepts bookings, per weekday
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
            <VenueAvailabilityEditor
              days={form.availabilityDays}
              onChange={(days) => updateField("availabilityDays", days)}
              inputClassName={INPUT_CLASS}
              labelClassName={LABEL_CLASS}
              hideLabel
            />
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="border-[var(--border)] bg-[var(--bg-1)] backdrop-blur-sm transition-all hover:border-[var(--border-strong)] hover:shadow-[0_2px_16px_-4px_rgba(0,0,0,0.3)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--teal-subtle)] to-[var(--teal-subtle)] ring-1 ring-[var(--teal-subtle)]">
                <Settings className="h-4 w-4 text-[var(--teal-text)]" />
              </div>
              <div>
                <CardTitle className="text-base">Settings</CardTitle>
                <CardDescription className="text-[var(--text-4)]">
                  Booking and facilities
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
            <div className="space-y-2">
              <Label htmlFor="maxAdvanceBookingDays" className={LABEL_CLASS}>
                Max Advance Booking (days) *
              </Label>
              <Input
                id="maxAdvanceBookingDays"
                type="number"
                min={1}
                max={365}
                required
                value={form.maxAdvanceBookingDays}
                onChange={(e) => {
                  const parsed = parseInt(e.target.value, 10);
                  updateField(
                    "maxAdvanceBookingDays",
                    Number.isFinite(parsed) && parsed >= 1 ? parsed : 1,
                  );
                }}
                className={INPUT_CLASS}
              />
            </div>

            <div className="space-y-2">
              <Label className={LABEL_CLASS}>Facilities</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {FACILITIES.map((f) => {
                  const active = form.facilities.includes(f.value);
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => toggleFacility(f.value)}
                      aria-pressed={active}
                      className={`rounded-md border px-2.5 py-2 text-[12.5px] font-medium transition-all ${
                        active
                          ? "border-[rgba(0,212,170,0.3)] bg-[var(--teal-subtle)] text-[var(--teal-text)]"
                          : "border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-3)] hover:border-[var(--border-strong)] hover:text-[var(--text-1)]"
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] p-4">
              <div>
                <p className="text-sm font-medium text-[var(--text-1)]">
                  Recurring Bookings
                </p>
                <p className="text-xs text-[var(--text-4)]">
                  Allow customers to book recurring sessions
                </p>
              </div>
              <Switch
                checked={form.allowRecurringBookings}
                onCheckedChange={(checked) =>
                  updateField("allowRecurringBookings", checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {submitError && (
          <div
            role="alert"
            className="flex gap-3 rounded-lg border border-[rgba(244,63,94,0.24)] bg-[rgba(244,63,94,0.08)] px-4 py-3 text-[13px] leading-6"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--semantic-red)]" />
            <div>
              <p className="font-medium text-[var(--semantic-red)]">
                The venue was not updated
              </p>
              <p className="mt-0.5 text-[var(--text-3)]">{submitError}</p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link href={`/dashboard/venues/${params.venueId}`}>
            <Button
              variant="outline"
              type="button"
              className="border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-2)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-1)]"
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSaving}
            size="lg"
            className="bg-[linear-gradient(135deg,var(--teal),#00b894)] px-6 font-semibold text-[#060a0e] shadow-[0_1px_12px_-2px_var(--teal-glow)] transition-all hover:-translate-y-px hover:brightness-110"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
