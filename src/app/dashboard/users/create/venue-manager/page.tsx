"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Mail, Table as TableIcon, User } from "lucide-react";
import { toast } from "sonner";

import { ContractTermsEditor } from "@/components/contract-terms-editor";
import { PhoneNumberField } from "@/components/phone-number-field";
import { VenueAvailabilityEditor } from "@/components/venue-availability-editor";
import { VenueLocationFields } from "@/components/venue-location-fields";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createContract,
  createVenue,
  createVenueManager,
  getApiErrorMessage,
  getApiErrorStatus,
  getApiFieldErrorMap,
} from "@/lib/api";
import {
  contractDraftError,
  contractDraftToPayload,
  defaultContractDraft,
  type ContractDraft,
} from "@/lib/contracts";
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY } from "@/lib/currencies";
import {
  DEFAULT_COUNTRY_CODE,
  isValidPhoneForCountry,
  normalizePhoneForSubmit,
  phoneValueForCountry,
} from "@/lib/phone";
import type { CreateVenueRequest, Facility, PaymentMode } from "@/types/api";
import {
  availabilityDaysWithErrors,
  defaultAvailabilityDays,
} from "@/components/venue-availability-editor";
import { browserTimeZone, TimezoneSelect } from "@/components/timezone-select";
import { BackLink } from "../_components/back-link";
import {
  FormFooter,
  FormSection,
  PreviewCard,
  PreviewRow,
  TextField,
} from "../_components/form-primitives";
import {
  generatePassword,
  passwordStrength,
  TempPasswordField,
} from "../_components/temp-password-field";
import { useSubmitShortcut } from "../_components/use-submit-shortcut";

const ACCENT = "amber" as const;
const FORM_ID = "create-vm-form";
const MIN_PASSWORD_LENGTH = 8;
const MIN_PASSWORD_STRENGTH = 2;

const INPUT_CLASS =
  "border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-1)] placeholder:text-[var(--text-4)] focus:border-[var(--semantic-amber)] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]";
const LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]";

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

type VmCreateFieldErrors = Partial<
  Record<
    "firstName" | "lastName" | "email" | "phoneNumber" | "tempPassword",
    string
  >
>;

function venueManagerFieldErrors(err: unknown): VmCreateFieldErrors {
  const fieldErrors = getApiFieldErrorMap(err);
  const message = getApiErrorMessage(err, "");
  const status = getApiErrorStatus(err);

  if (status === 409 && /email/i.test(message)) {
    fieldErrors.email = message;
  }
  if (status === 400 && /phone/i.test(message)) {
    fieldErrors.phoneNumber = message;
  }

  return fieldErrors;
}

function emptyVenue(): CreateVenueRequest {
  return {
    managerId: "",
    nameEn: "",
    nameAr: "",
    description: "",
    addressLine: "",
    city: "",
    timeZoneId: browserTimeZone(),
    countryCode: DEFAULT_COUNTRY_CODE,
    latitude: 0,
    longitude: 0,
    contactPhone: "",
    contactEmail: "",
    currencyCode: DEFAULT_CURRENCY,
    paymentMode: "BOTH",
    allowRecurringBookings: false,
    courtLimit: undefined,
    maxAdvanceBookingDays: 30,
    facilities: [],
    availability: { days: defaultAvailabilityDays() },
  };
}

export default function CreateVenueManagerPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] =
    useState(DEFAULT_COUNTRY_CODE);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [venue, setVenue] = useState<CreateVenueRequest>(emptyVenue);
  const [contractDraft, setContractDraft] = useState<ContractDraft>(
    defaultContractDraft(DEFAULT_CURRENCY),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<VmCreateFieldErrors>({});
  const inFlight = useRef(false);

  useSubmitShortcut(FORM_ID);

  useEffect(() => {
    setTempPassword((current) => current || generatePassword());
  }, []);

  const strength = useMemo(
    () => passwordStrength(tempPassword),
    [tempPassword],
  );

  function updateVenue<K extends keyof CreateVenueRequest>(
    key: K,
    value: CreateVenueRequest[K],
  ) {
    setSubmitError(null);
    setVenue((prev) => ({ ...prev, [key]: value }));
    if (key === "currencyCode" && typeof value === "string") {
      setContractDraft((prev) => ({ ...prev, currencyCode: value }));
    }
  }

  function updateContract(patch: Partial<ContractDraft>) {
    setSubmitError(null);
    setContractDraft((prev) => ({ ...prev, ...patch }));
  }

  function updateCountryCode(countryCode: string) {
    setVenue((prev) => ({
      ...prev,
      countryCode,
      contactPhone: phoneValueForCountry(prev.contactPhone, countryCode),
    }));
  }

  function toggleFacility(facility: Facility) {
    setVenue((prev) => {
      const set = new Set(prev.facilities ?? []);
      if (set.has(facility)) set.delete(facility);
      else set.add(facility);
      return { ...prev, facilities: [...set] };
    });
  }

  const accountValid = Boolean(
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    isValidPhoneForCountry(phoneNumber, phoneCountryCode) &&
    tempPassword.length >= MIN_PASSWORD_LENGTH &&
    strength >= MIN_PASSWORD_STRENGTH,
  );

  const venueValid = Boolean(
    venue.nameEn.trim() &&
    venue.nameAr.trim() &&
    venue.addressLine.trim() &&
    venue.city.trim() &&
    venue.timeZoneId &&
    venue.contactEmail?.trim() &&
    isValidPhoneForCountry(venue.contactPhone ?? "", venue.countryCode) &&
    venue.currencyCode.trim().length === 3 &&
    venue.courtLimit !== undefined &&
    Number.isFinite(venue.courtLimit) &&
    venue.courtLimit >= 1 &&
    venue.maxAdvanceBookingDays !== undefined &&
    venue.maxAdvanceBookingDays >= 1 &&
    venue.maxAdvanceBookingDays <= 365 &&
    availabilityDaysWithErrors(venue.availability?.days ?? []).length === 0,
  );

  const canSubmit =
    accountValid && venueValid && !contractDraftError(contractDraft);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit || inFlight.current) return;

      const contractError = contractDraftError(contractDraft);
      if (contractError) {
        setSubmitError(contractError);
        return;
      }

      inFlight.current = true;
      setIsSubmitting(true);
      setSubmitError(null);
      setFieldErrors({});
      try {
        const manager = await createVenueManager({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber:
            normalizePhoneForSubmit(phoneNumber, phoneCountryCode) ??
            phoneNumber.trim(),
          tempPassword,
        });

        const availabilityDays = venue.availability?.days ?? [];
        const createdVenue = await createVenue({
          ...venue,
          managerId: manager.id,
          nameEn: venue.nameEn.trim(),
          nameAr: venue.nameAr.trim(),
          description: venue.description?.trim() || undefined,
          addressLine: venue.addressLine.trim(),
          city: venue.city.trim(),
          countryCode: venue.countryCode.trim().toUpperCase(),
          contactEmail: venue.contactEmail?.trim() || undefined,
          contactPhone: normalizePhoneForSubmit(
            venue.contactPhone,
            venue.countryCode,
          ),
          currencyCode: venue.currencyCode.trim().toUpperCase(),
          availability:
            availabilityDays.length > 0
              ? { days: availabilityDays }
              : undefined,
        });

        await createContract(
          createdVenue.id,
          contractDraftToPayload(contractDraft),
        );

        toast.success(
          `Venue Manager ${firstName.trim()} ${lastName.trim()} onboarded`,
        );
        router.push(`/dashboard/venues/${createdVenue.id}`);
      } catch (err: unknown) {
        setFieldErrors(venueManagerFieldErrors(err));
        const message = getApiErrorMessage(
          err,
          "Failed to onboard venue manager",
        );
        setSubmitError(message);
        toast.error(message);
      } finally {
        inFlight.current = false;
        setIsSubmitting(false);
      }
    },
    [
      canSubmit,
      contractDraft,
      email,
      firstName,
      lastName,
      phoneCountryCode,
      phoneNumber,
      router,
      tempPassword,
      venue,
    ],
  );

  const clearFieldError = useCallback((field: keyof VmCreateFieldErrors) => {
    setSubmitError(null);
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  const preview = {
    initials: `${firstName[0] ?? "J"}${lastName[0] ?? "S"}`.toUpperCase(),
    name: `${firstName.trim() || "First"} ${lastName.trim() || "Last"}`.trim(),
    email: email.trim() || "manager@venue.com",
    venue: venue.nameEn.trim() || "Venue name",
    fee:
      contractDraft.feeModel === "PER_RESERVATION"
        ? `${contractDraft.currencyCode} ${contractDraft.perReservationFee} / reservation`
        : `${contractDraft.currencyCode} ${contractDraft.fixedMonthlyFee} monthly`,
  };

  return (
    <div className="users-create-v2 space-y-0">
      <BackLink href="/dashboard/users/create" label="Choose role" />

      <div className="mb-7">
        <h1 className="mb-1.5 text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-1)]">
          Create a venue manager
        </h1>
        <p className="text-[13.5px] tracking-[-0.003em] text-[var(--text-3)]">
          Create the manager account, venue workspace, and active contract in
          one submission.
        </p>
      </div>

      <form id={FORM_ID} onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="uv2c-card overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)]">
            <FormSection
              step={1}
              accent={ACCENT}
              label="Personal info"
              title="Who are they?"
              desc="Their name appears in the directory and on audit logs."
            >
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <TextField
                  label="First name"
                  required
                  icon={User}
                  accent={ACCENT}
                  value={firstName}
                  onChange={(value) => {
                    clearFieldError("firstName");
                    setFirstName(value);
                  }}
                  placeholder="Jane"
                  error={fieldErrors.firstName}
                />
                <TextField
                  label="Last name"
                  required
                  icon={User}
                  accent={ACCENT}
                  value={lastName}
                  onChange={(value) => {
                    clearFieldError("lastName");
                    setLastName(value);
                  }}
                  placeholder="Smith"
                  error={fieldErrors.lastName}
                />
              </div>
            </FormSection>

            <FormSection
              step={2}
              accent={ACCENT}
              label="Contact"
              title="How do we reach them?"
              desc="Email is how they receive credentials. Phone is required."
            >
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <TextField
                  label="Email address"
                  required
                  icon={Mail}
                  type="email"
                  accent={ACCENT}
                  value={email}
                  onChange={(value) => {
                    clearFieldError("email");
                    setEmail(value);
                  }}
                  placeholder="manager@venue.com"
                  error={fieldErrors.email}
                />
                <div className="space-y-1.5">
                  <PhoneNumberField
                    required
                    countryCode={phoneCountryCode}
                    phoneNumber={phoneNumber}
                    onCountryCodeChange={(value) => {
                      clearFieldError("phoneNumber");
                      setPhoneCountryCode(value);
                    }}
                    onPhoneNumberChange={(value) => {
                      clearFieldError("phoneNumber");
                      setPhoneNumber(value);
                    }}
                    inputClassName={INPUT_CLASS}
                    labelClassName={LABEL_CLASS}
                  />
                  {fieldErrors.phoneNumber && (
                    <p
                      role="alert"
                      className="text-[11px] leading-[1.4] text-[var(--semantic-red)]"
                    >
                      {fieldErrors.phoneNumber}
                    </p>
                  )}
                </div>
              </div>
            </FormSection>

            <FormSection
              step={3}
              accent={ACCENT}
              label="Credentials"
              title="Set a temporary password"
              desc="They will be prompted to change it on first login."
            >
              <TempPasswordField
                value={tempPassword}
                onChange={(value) => {
                  clearFieldError("tempPassword");
                  setTempPassword(value);
                }}
                strength={strength}
              />
              {fieldErrors.tempPassword && (
                <p
                  role="alert"
                  className="mt-2 text-[11px] leading-[1.4] text-[var(--semantic-red)]"
                >
                  {fieldErrors.tempPassword}
                </p>
              )}
            </FormSection>

            <FormSection
              step={4}
              accent={ACCENT}
              label="Venue"
              title="Create their venue"
              desc="The venue is assigned to the manager returned by the account API."
            >
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Venue name (English)" required>
                  <input
                    value={venue.nameEn}
                    onChange={(e) => updateVenue("nameEn", e.target.value)}
                    placeholder="Arena Sports Complex"
                    className={`h-[38px] w-full rounded-md border px-3 text-[13.5px] outline-none transition-all ${INPUT_CLASS}`}
                  />
                </Field>
                <Field label="Venue name (Arabic)" required>
                  <input
                    dir="rtl"
                    lang="ar"
                    value={venue.nameAr}
                    onChange={(e) => updateVenue("nameAr", e.target.value)}
                    placeholder="Arabic venue name"
                    className={`h-[38px] w-full rounded-md border px-3 text-[13.5px] outline-none transition-all ${INPUT_CLASS}`}
                  />
                </Field>
                <Field label="Description" className="sm:col-span-2">
                  <Textarea
                    value={venue.description ?? ""}
                    onChange={(e) => updateVenue("description", e.target.value)}
                    placeholder="Short operational description"
                    rows={3}
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label="Contact email" required>
                  <input
                    type="email"
                    value={venue.contactEmail ?? ""}
                    onChange={(e) =>
                      updateVenue("contactEmail", e.target.value)
                    }
                    placeholder="frontdesk@venue.com"
                    className={`h-[38px] w-full rounded-md border px-3 text-[13.5px] outline-none transition-all ${INPUT_CLASS}`}
                  />
                </Field>
                <PhoneNumberField
                  countryCode={venue.countryCode}
                  phoneNumber={venue.contactPhone ?? ""}
                  onCountryCodeChange={updateCountryCode}
                  onPhoneNumberChange={(value) =>
                    updateVenue("contactPhone", value)
                  }
                  phoneLabel="Contact phone"
                  required
                  inputClassName={INPUT_CLASS}
                  labelClassName={LABEL_CLASS}
                />
                <Field label="Address" required className="sm:col-span-2">
                  <input
                    value={venue.addressLine}
                    onChange={(e) => updateVenue("addressLine", e.target.value)}
                    placeholder="Full street address"
                    className={`h-[38px] w-full rounded-md border px-3 text-[13.5px] outline-none transition-all ${INPUT_CLASS}`}
                  />
                </Field>
                <VenueLocationFields
                  className="sm:col-span-2"
                  city={venue.city}
                  latitude={venue.latitude}
                  longitude={venue.longitude}
                  onCityChange={(city) => updateVenue("city", city)}
                  onCoordinatesChange={({ latitude, longitude }) =>
                    setVenue((prev) => ({ ...prev, latitude, longitude }))
                  }
                  inputClassName={INPUT_CLASS}
                  labelClassName={LABEL_CLASS}
                />
              </div>
            </FormSection>

            <FormSection
              step={5}
              accent={ACCENT}
              label="Venue defaults"
              title="Booking and payment setup"
              desc="These values are sent with the venue create payload."
            >
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Payment mode" required>
                  <select
                    value={venue.paymentMode}
                    onChange={(e) =>
                      updateVenue("paymentMode", e.target.value as PaymentMode)
                    }
                    className={`h-[38px] w-full rounded-md border px-3 text-[13.5px] outline-none transition-all ${INPUT_CLASS}`}
                  >
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Currency" required>
                  <select
                    value={venue.currencyCode}
                    onChange={(e) =>
                      updateVenue("currencyCode", e.target.value)
                    }
                    className={`h-[38px] w-full rounded-md border px-3 text-[13.5px] outline-none transition-all ${INPUT_CLASS}`}
                  >
                    {CURRENCY_OPTIONS.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Court limit" required>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={venue.courtLimit ?? ""}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value, 10);
                      updateVenue(
                        "courtLimit",
                        Number.isFinite(parsed) ? parsed : undefined,
                      );
                    }}
                    placeholder="e.g. 8"
                    className={`h-[38px] w-full rounded-md border px-3 text-[13.5px] outline-none transition-all ${INPUT_CLASS}`}
                  />
                </Field>
                <Field label="Max advance booking days" required>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={venue.maxAdvanceBookingDays}
                    onChange={(e) =>
                      updateVenue(
                        "maxAdvanceBookingDays",
                        Number.parseInt(e.target.value, 10) || 30,
                      )
                    }
                    className={`h-[38px] w-full rounded-md border px-3 text-[13.5px] outline-none transition-all ${INPUT_CLASS}`}
                  />
                </Field>
              </div>

              <div className="mt-4 space-y-2">
                <label className={LABEL_CLASS}>Time zone</label>
                <TimezoneSelect
                  value={venue.timeZoneId}
                  onChange={(value) => updateVenue("timeZoneId", value)}
                  triggerClassName={INPUT_CLASS}
                />
              </div>

              <div className="mt-4">
                <VenueAvailabilityEditor
                  days={venue.availability?.days ?? []}
                  onChange={(days) => updateVenue("availability", { days })}
                  inputClassName={INPUT_CLASS}
                  labelClassName={LABEL_CLASS}
                />
              </div>

              <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg-0)] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[13.5px] font-medium text-[var(--text-1)]">
                      Recurring bookings
                    </div>
                    <div className="mt-1 text-[12px] text-[var(--text-3)]">
                      Allow customers to book repeated sessions.
                    </div>
                  </div>
                  <Switch
                    checked={venue.allowRecurringBookings}
                    onCheckedChange={(checked) =>
                      updateVenue("allowRecurringBookings", checked)
                    }
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className={LABEL_CLASS}>Facilities</label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {FACILITIES.map((facility) => {
                    const active = (venue.facilities ?? []).includes(
                      facility.value,
                    );
                    return (
                      <button
                        key={facility.value}
                        type="button"
                        onClick={() => toggleFacility(facility.value)}
                        aria-pressed={active}
                        className={`rounded-md border px-2.5 py-2 text-[12.5px] font-medium transition-all ${
                          active
                            ? "border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)] text-[var(--semantic-amber)]"
                            : "border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-3)] hover:border-[var(--border-strong)] hover:text-[var(--text-1)]"
                        }`}
                      >
                        {facility.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </FormSection>

            <FormSection
              step={6}
              accent={ACCENT}
              label="Contract terms"
              title="Create the active venue contract"
              desc="This is posted only after the venue exists and uses the returned venue id."
            >
              <ContractTermsEditor
                draft={contractDraft}
                onChange={updateContract}
                inputClassName={INPUT_CLASS}
                labelClassName={LABEL_CLASS}
              />
            </FormSection>

            {submitError && (
              <div
                role="alert"
                className="border-t border-[var(--border)] bg-[rgba(244,63,94,0.08)] px-6 py-4 text-[13px] leading-6 text-[var(--semantic-red)]"
              >
                {submitError}
              </div>
            )}

            <FormFooter
              accent={ACCENT}
              submitting={isSubmitting}
              canSubmit={canSubmit}
              submitLabel="Onboard Manager"
              submitIcon={TableIcon}
              cancelHref="/dashboard/users"
            />
          </div>

          <PreviewCard
            accent={ACCENT}
            initials={preview.initials}
            name={preview.name}
            email={preview.email}
            badgeLabel="Venue Manager"
            badgeIcon={TableIcon}
          >
            <div className="flex flex-col gap-2">
              <PreviewRow label="Venue" value={preview.venue} />
              <PreviewRow label="City" value={venue.city || "City"} />
              <PreviewRow label="Payment" value={venue.paymentMode} />
              <PreviewRow label="Contract" value={preview.fee} mono />
              <PreviewRow
                label="Grace"
                value={`${contractDraft.gracePeriodDays} days`}
              />
            </div>
            <div className="mt-3.5 flex gap-2 rounded-md border border-[rgba(245,158,11,0.14)] bg-[rgba(245,158,11,0.08)] px-3 py-2.5">
              <div className="text-[11.5px] leading-[1.5] text-[var(--text-2)]">
                Submit runs account, venue, then contract creation in order.
              </div>
            </div>
          </PreviewCard>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label className={LABEL_CLASS}>
        {label}
        {required && (
          <span className="ml-1.5 text-[var(--semantic-red)] opacity-85">
            *
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
