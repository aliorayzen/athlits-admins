"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createVenue, getApiErrorMessage, getVenueManagers } from "@/lib/api";
import type {
  CreateVenueRequest,
  Facility,
  PaymentMode,
  UserDto,
} from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneNumberField } from "@/components/phone-number-field";
import { Textarea } from "@/components/ui/textarea";
import {
  availabilityDaysToUtc,
  availabilityDaysWithErrors,
  defaultAvailabilityDays,
  VenueAvailabilityEditor,
} from "@/components/venue-availability-editor";
import { VenueLocationPicker } from "@/components/venue-location-picker";
import type { ResolvedPlace } from "@/components/venue-location-picker";
import { browserTimeZone, TimezoneSelect } from "@/components/timezone-select";
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
  ImageIcon,
  Loader2,
  MapPin,
  Settings,
  UserCog,
} from "lucide-react";
import Link from "next/link";

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "CASH", label: "Cash only" },
  { value: "ONLINE", label: "Online only" },
  { value: "BOTH", label: "Cash & online" },
];

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

type ManagersState = "loading" | "ready" | "error";

export default function NewVenuePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [coverImageBroken, setCoverImageBroken] = useState(false);

  const [managers, setManagers] = useState<UserDto[]>([]);
  const [managersState, setManagersState] = useState<ManagersState>("loading");

  const [form, setForm] = useState<CreateVenueRequest>({
    managerId: "",
    name: "",
    description: "",
    addressLine: "",
    city: "",
    timeZoneId: browserTimeZone(),
    countryCode: DEFAULT_COUNTRY_CODE,
    latitude: 0,
    longitude: 0,
    contactPhone: "",
    contactEmail: "",
    coverImage: "",
    currencyCode: "SAR",
    paymentMode: "CASH",
    allowRecurringBookings: false,
    // Required by the backend; left blank until the operator enters a value.
    courtLimit: undefined,
    maxAdvanceBookingDays: 30,
    facilities: [],
    availability: { days: defaultAvailabilityDays() },
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getVenueManagers({ size: 100, sort: "firstName,asc" })
      .then((res) => {
        if (cancelled) return;
        setManagers(res.content);
        setManagersState("ready");
      })
      .catch(() => {
        if (!cancelled) setManagersState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateField<K extends keyof CreateVenueRequest>(
    key: K,
    value: CreateVenueRequest[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateCountryCode(countryCode: string) {
    setForm((prev) => ({
      ...prev,
      countryCode,
      contactPhone: phoneValueForCountry(prev.contactPhone, countryCode),
    }));
  }

  function toggleFacility(facility: Facility) {
    setForm((prev) => {
      const set = new Set(prev.facilities ?? []);
      if (set.has(facility)) set.delete(facility);
      else set.add(facility);
      return { ...prev, facilities: [...set] };
    });
  }

  // Autofill address + city from the resolved map pin, but only when those
  // fields are still empty so we never clobber what the operator typed.
  function handleResolvedAddress(place: ResolvedPlace) {
    setForm((prev) => ({
      ...prev,
      addressLine:
        prev.addressLine.trim() || !place.addressLine
          ? prev.addressLine
          : place.addressLine,
      city: prev.city.trim() || !place.city ? prev.city : place.city,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!form.managerId) {
      setSubmitError("Select a venue manager to own this venue.");
      return;
    }
    if (!form.timeZoneId) {
      setSubmitError("Select the time zone the venue operates in.");
      return;
    }
    if (
      form.courtLimit === undefined ||
      !Number.isFinite(form.courtLimit) ||
      form.courtLimit < 1
    ) {
      setSubmitError("Enter the court limit (at least 1).");
      return;
    }
    if (availabilityDaysWithErrors(form.availability?.days ?? []).length > 0) {
      setSubmitError(
        "Fix the operating hours: every open day needs a closing time after its opening time.",
      );
      return;
    }
    setIsLoading(true);
    try {
      const availabilityDays = form.availability?.days ?? [];
      const venue = await createVenue({
        ...form,
        contactPhone: normalizePhoneForSubmit(
          form.contactPhone,
          form.countryCode,
        ),
        // Backend rejects an availability object with zero days; omit instead.
        // Times are entered in local time and stored in UTC.
        availability:
          availabilityDays.length > 0
            ? { days: availabilityDaysToUtc(availabilityDays) }
            : undefined,
      });
      toast.success(`Venue "${venue.name}" created`);
      router.push(`/dashboard/venues/${venue.id}`);
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, "Failed to create venue");
      setSubmitError(message);
      toast.error("Failed to create venue");
    } finally {
      setIsLoading(false);
    }
  }

  const noManagers = managersState === "ready" && managers.length === 0;
  const coverImageUrl = form.coverImage?.trim() ?? "";
  const coverImagePreview =
    !coverImageBroken && /^https?:\/\//i.test(coverImageUrl)
      ? coverImageUrl
      : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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
          <h1 className="text-2xl font-semibold tracking-tight">Add Venue</h1>
          <p className="text-sm text-[var(--text-3)]">
            Onboard a new venue to the platform
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Assignment & Payment */}
        <Card className="border-[var(--border)] bg-[var(--bg-1)] backdrop-blur-sm transition-all hover:border-[var(--border-strong)] hover:shadow-[0_2px_16px_-4px_rgba(0,0,0,0.3)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--teal-subtle)] to-[var(--teal-subtle)] ring-1 ring-[var(--teal-subtle)]">
                <UserCog className="h-4 w-4 text-[var(--teal-text)]" />
              </div>
              <div>
                <CardTitle className="text-base">
                  Manager &amp; payment
                </CardTitle>
                <CardDescription className="text-[var(--text-4)]">
                  Who runs this venue and how it takes payment
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
            <div className="space-y-2">
              <Label htmlFor="managerId" className={LABEL_CLASS}>
                Venue Manager *
              </Label>
              {noManagers ? (
                <div className="rounded-lg border border-[rgba(245,158,11,0.25)] bg-[var(--semantic-amber-subtle)] px-3.5 py-3 text-[13px] text-[var(--semantic-amber)]">
                  No venue managers exist yet. A venue must be assigned to one.{" "}
                  <Link
                    href="/dashboard/users/create/venue-manager"
                    className="font-medium underline underline-offset-2"
                  >
                    Create a venue manager
                  </Link>{" "}
                  first.
                </div>
              ) : (
                <select
                  id="managerId"
                  required
                  value={form.managerId}
                  disabled={managersState !== "ready"}
                  onChange={(e) => updateField("managerId", e.target.value)}
                  className={`h-9 w-full rounded-md border px-3 text-sm outline-none transition-all disabled:opacity-50 ${INPUT_CLASS}`}
                >
                  <option value="" disabled>
                    {managersState === "loading"
                      ? "Loading managers…"
                      : managersState === "error"
                        ? "Couldn't load managers"
                        : "Select a venue manager"}
                  </option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {`${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() ||
                        "Unnamed"}{" "}
                      — {m.email}
                    </option>
                  ))}
                </select>
              )}
              {managersState === "error" && (
                <p className="text-xs text-[var(--semantic-red)]">
                  Couldn&apos;t load venue managers. Refresh and try again.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMode" className={LABEL_CLASS}>
                Payment Mode *
              </Label>
              <select
                id="paymentMode"
                required
                value={form.paymentMode}
                onChange={(e) =>
                  updateField("paymentMode", e.target.value as PaymentMode)
                }
                className={`h-9 w-full rounded-md border px-3 text-sm outline-none transition-all ${INPUT_CLASS}`}
              >
                {PAYMENT_MODES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

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
            <div className="space-y-2">
              <Label htmlFor="name" className={LABEL_CLASS}>
                Venue Name *
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g. Arena Sports Complex"
                required
                className={INPUT_CLASS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className={LABEL_CLASS}>
                Description
              </Label>
              <Textarea
                id="description"
                value={form.description ?? ""}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Brief description of the venue"
                rows={3}
                className={INPUT_CLASS}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactEmail" className={LABEL_CLASS}>
                  Contact Email
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={form.contactEmail ?? ""}
                  onChange={(e) => updateField("contactEmail", e.target.value)}
                  placeholder="venue@example.com"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coverImage" className={LABEL_CLASS}>
                <span className="inline-flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Cover Image URL
                </span>
              </Label>
              <div className="flex items-start gap-3">
                <div className="grid h-16 w-24 shrink-0 place-items-center overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-hover)]">
                  {coverImagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverImagePreview}
                      alt="Cover preview"
                      className="h-full w-full object-cover"
                      onError={() => setCoverImageBroken(true)}
                    />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-[var(--text-4)]" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Input
                    id="coverImage"
                    type="url"
                    inputMode="url"
                    value={form.coverImage ?? ""}
                    onChange={(e) => {
                      setCoverImageBroken(false);
                      updateField("coverImage", e.target.value);
                    }}
                    placeholder="https://cdn.example.com/venue.jpg"
                    className={INPUT_CLASS}
                  />
                  <p className="text-xs text-[var(--text-4)]">
                    {coverImageBroken
                      ? "That image didn't load. Check the URL is public and direct."
                      : "Paste a direct, public link to the venue's cover image."}
                  </p>
                </div>
              </div>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city" className={LABEL_CLASS}>
                  City *
                </Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="e.g. Beirut"
                  required
                  className={INPUT_CLASS}
                />
              </div>
              <PhoneNumberField
                countryCode={form.countryCode}
                phoneNumber={form.contactPhone ?? ""}
                onCountryCodeChange={updateCountryCode}
                onPhoneNumberChange={(value) =>
                  updateField("contactPhone", value)
                }
                phoneLabel="Contact phone"
                inputClassName={INPUT_CLASS}
                labelClassName={LABEL_CLASS}
              />
            </div>
            <VenueLocationPicker
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={({ latitude, longitude }) =>
                setForm((prev) => ({ ...prev, latitude, longitude }))
              }
              onResolveAddress={handleResolvedAddress}
              inputClassName={INPUT_CLASS}
              labelClassName={LABEL_CLASS}
            />
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
            <div className="space-y-2">
              <Label htmlFor="timeZoneId" className={LABEL_CLASS}>
                Time Zone *
              </Label>
              <TimezoneSelect
                id="timeZoneId"
                value={form.timeZoneId}
                onChange={(timeZoneId) => updateField("timeZoneId", timeZoneId)}
                triggerClassName={INPUT_CLASS}
              />
              <p className="text-xs text-[var(--text-4)]">
                Opening hours below are interpreted in this zone.
              </p>
            </div>
            <VenueAvailabilityEditor
              days={form.availability?.days ?? []}
              onChange={(days) => updateField("availability", { days })}
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
                  Currency, booking, and facilities
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currencyCode" className={LABEL_CLASS}>
                  Currency *
                </Label>
                <Input
                  id="currencyCode"
                  value={form.currencyCode}
                  onChange={(e) =>
                    updateField("currencyCode", e.target.value.toUpperCase())
                  }
                  placeholder="SAR"
                  maxLength={3}
                  minLength={3}
                  required
                  pattern="[A-Z]{3}"
                  title="Three-letter currency code, e.g. SAR"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxAdvanceBookingDays" className={LABEL_CLASS}>
                  Max Advance Booking (days)
                </Label>
                <Input
                  id="maxAdvanceBookingDays"
                  type="number"
                  min={1}
                  max={365}
                  required
                  value={form.maxAdvanceBookingDays}
                  onChange={(e) =>
                    updateField(
                      "maxAdvanceBookingDays",
                      parseInt(e.target.value) || 30,
                    )
                  }
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="courtLimit" className={LABEL_CLASS}>
                  Court Limit *
                </Label>
                <Input
                  id="courtLimit"
                  type="number"
                  min={1}
                  max={1000}
                  required
                  value={form.courtLimit ?? ""}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    updateField(
                      "courtLimit",
                      Number.isFinite(parsed) ? parsed : undefined,
                    );
                  }}
                  placeholder="e.g. 8"
                  className={INPUT_CLASS}
                />
                <p className="text-xs text-[var(--text-4)]">
                  Maximum courts this venue can host.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className={LABEL_CLASS}>Facilities</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {FACILITIES.map((f) => {
                  const active = (form.facilities ?? []).includes(f.value);
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
                The venue was not created
              </p>
              <p className="mt-0.5 text-[var(--text-3)]">{submitError}</p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/dashboard/venues">
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
            disabled={isLoading || noManagers}
            size="lg"
            className="bg-[linear-gradient(135deg,var(--teal),#00b894)] px-6 font-semibold text-[#060a0e] shadow-[0_1px_12px_-2px_var(--teal-glow)] transition-all hover:-translate-y-px hover:brightness-110"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Venue"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
