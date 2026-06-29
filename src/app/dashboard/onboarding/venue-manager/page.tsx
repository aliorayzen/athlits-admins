"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Search,
  Sparkles,
  UserCog,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import {
  createVenue,
  createVenueManager,
  getApiErrorMessage,
  getApiErrorStatus,
  getApiFieldErrorMap,
  getVenueManagers,
} from "@/lib/api";
import type {
  CreateVenueRequest,
  Facility,
  PaymentMode,
  UserDto,
  VenueDetailResponse,
} from "@/types/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneNumberField } from "@/components/phone-number-field";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  availabilityDaysWithErrors,
  defaultAvailabilityDays,
  VenueAvailabilityEditor,
} from "@/components/venue-availability-editor";
import { VenueLocationFields } from "@/components/venue-location-fields";
import { browserTimeZone, TimezoneSelect } from "@/components/timezone-select";
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY } from "@/lib/currencies";
import {
  DEFAULT_COUNTRY_CODE,
  isValidPhoneForCountry,
  normalizePhoneForSubmit,
  phoneValueForCountry,
} from "@/lib/phone";
import {
  generatePassword,
  passwordStrength,
  TempPasswordField,
} from "../../users/create/_components/temp-password-field";

type StepKey = "manager" | "venue" | "review";
type ManagerMode = "existing" | "new";
type ManagersState = "loading" | "ready" | "error";
type ManagerFieldErrors = Partial<
  Record<
    "firstName" | "lastName" | "email" | "phoneNumber" | "tempPassword",
    string
  >
>;

const STEPS: Array<{
  key: StepKey;
  label: string;
  title: string;
  icon: typeof UserCog;
}> = [
  {
    key: "manager",
    label: "Manager",
    title: "Assign ownership",
    icon: UserCog,
  },
  { key: "venue", label: "Venue", title: "Create venue", icon: Building2 },
  {
    key: "review",
    label: "Review",
    title: "Check records",
    icon: ClipboardCheck,
  },
];

const PAYMENT_MODES: { value: PaymentMode; label: string; note: string }[] = [
  {
    value: "CASH",
    label: "Cash only",
    note: "Venue collects payments on-site",
  },
  { value: "ONLINE", label: "Online only", note: "Payments stay digital" },
  { value: "BOTH", label: "Cash & online", note: "Most flexible for launch" },
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

const fieldClass =
  "h-9 border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-1)] placeholder:text-[var(--text-4)] focus:border-[var(--teal)] focus:ring-[3px] focus:ring-[var(--teal-subtle)]";
const labelClass =
  "text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]";

const emptyVenue = (): CreateVenueRequest => ({
  managerId: "",
  nameEn: "",
  nameAr: "",
  description: "",
  addressLine: "",
  city: "",
  countryCode: DEFAULT_COUNTRY_CODE,
  latitude: 0,
  longitude: 0,
  contactPhone: "",
  contactEmail: "",
  timeZoneId: browserTimeZone(),
  currencyCode: DEFAULT_CURRENCY,
  paymentMode: "BOTH",
  allowRecurringBookings: false,
  courtLimit: undefined,
  maxAdvanceBookingDays: 30,
  facilities: [],
  availability: { days: defaultAvailabilityDays() },
});

function managerName(manager: UserDto): string {
  return (
    `${manager.firstName ?? ""} ${manager.lastName ?? ""}`.trim() ||
    manager.email
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase() || "VM";
}

function isServerError(err: unknown): boolean {
  const status = getApiErrorStatus(err);
  return status !== null && status >= 500;
}

function venueManagerFieldErrors(err: unknown): ManagerFieldErrors {
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

// The backend requires a non-blank, well-formed contact email on create.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(value: string | undefined): boolean {
  return Boolean(value && EMAIL_PATTERN.test(value.trim()));
}

export default function OnboardingVenueManagerPage() {
  const router = useRouter();
  const inFlight = useRef(false);

  const [step, setStep] = useState<StepKey>("manager");
  const [managerMode, setManagerMode] = useState<ManagerMode>("existing");
  const [managers, setManagers] = useState<UserDto[]>([]);
  const [managersState, setManagersState] = useState<ManagersState>("loading");
  const [managerSearch, setManagerSearch] = useState("");
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepErrors, setStepErrors] = useState<
    Partial<Record<StepKey, string>>
  >({});
  const [managerFieldErrors, setManagerFieldErrors] =
    useState<ManagerFieldErrors>({});
  const [createdManager, setCreatedManager] = useState<UserDto | null>(null);
  const [createdVenue, setCreatedVenue] = useState<VenueDetailResponse | null>(
    null,
  );

  const [managerDraft, setManagerDraft] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    phoneCountryCode: String(DEFAULT_COUNTRY_CODE),
    tempPassword: "",
  });
  const [venue, setVenue] = useState<CreateVenueRequest>(emptyVenue);

  useEffect(() => {
    setManagerDraft((current) => ({
      ...current,
      tempPassword: current.tempPassword || generatePassword(),
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    getVenueManagers({ size: 100, sort: "firstName,asc" })
      .then((res) => {
        if (cancelled) return;
        setManagers(res.content);
        setManagersState("ready");
        if (res.content.length === 0) setManagerMode("new");
      })
      .catch(() => {
        if (!cancelled) setManagersState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const passwordScore = useMemo<0 | 1 | 2 | 3 | 4>(
    () => passwordStrength(managerDraft.tempPassword),
    [managerDraft.tempPassword],
  );

  const filteredManagers = useMemo(() => {
    const q = managerSearch.trim().toLowerCase();
    if (!q) return managers;
    return managers.filter((m) =>
      `${managerName(m)} ${m.email} ${m.phoneNumber ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [managerSearch, managers]);

  const selectedManager = managers.find((m) => m.id === selectedManagerId);
  const activeManager =
    managerMode === "new" ? (createdManager ?? undefined) : selectedManager;
  const activeManagerId = activeManager?.id ?? "";

  const managerValid =
    managerMode === "existing"
      ? Boolean(selectedManagerId)
      : Boolean(
          managerDraft.firstName.trim() &&
          managerDraft.lastName.trim() &&
          managerDraft.email.trim() &&
          isValidPhoneForCountry(
            managerDraft.phoneNumber,
            managerDraft.phoneCountryCode,
          ) &&
          managerDraft.tempPassword.length >= 10 &&
          passwordScore >= 3,
        );

  const venueValid = Boolean(
    activeManagerId &&
    venue.nameEn.trim() &&
    venue.nameAr.trim() &&
    venue.addressLine.trim() &&
    venue.city.trim() &&
    isValidEmail(venue.contactEmail) &&
    isValidPhoneForCountry(venue.contactPhone ?? "", venue.countryCode) &&
    venue.countryCode.trim().length === 2 &&
    venue.timeZoneId &&
    venue.currencyCode.trim().length === 3 &&
    venue.courtLimit !== undefined &&
    Number.isFinite(venue.courtLimit) &&
    venue.courtLimit >= 1 &&
    venue.maxAdvanceBookingDays !== undefined &&
    venue.maxAdvanceBookingDays >= 1 &&
    venue.maxAdvanceBookingDays <= 365 &&
    venue.paymentMode &&
    availabilityDaysWithErrors(venue.availability?.days ?? []).length === 0,
  );

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const progressPercent =
    STEPS.length <= 1 ? 0 : (stepIndex / (STEPS.length - 1)) * 100;

  function updateVenue<K extends keyof CreateVenueRequest>(
    key: K,
    value: CreateVenueRequest[K],
  ) {
    setStepErrors((prev) => ({ ...prev, venue: undefined }));
    setCreatedVenue(null);
    setVenue((prev) => ({ ...prev, [key]: value }));
  }

  function updateManager<K extends keyof typeof managerDraft>(
    key: K,
    value: (typeof managerDraft)[K],
  ) {
    setStepErrors((prev) => ({ ...prev, manager: undefined }));
    const errorKey: keyof ManagerFieldErrors =
      key === "phoneCountryCode"
        ? "phoneNumber"
        : (key as keyof ManagerFieldErrors);
    setManagerFieldErrors((current) => {
      if (!current[errorKey]) return current;
      const next = { ...current };
      delete next[errorKey];
      return next;
    });
    setCreatedManager(null);
    setCreatedVenue(null);
    setManagerDraft((prev) => ({ ...prev, [key]: value }));
  }

  function toggleFacility(facility: Facility) {
    setStepErrors((prev) => ({ ...prev, venue: undefined }));
    setCreatedVenue(null);
    setVenue((prev) => {
      const set = new Set(prev.facilities ?? []);
      if (set.has(facility)) set.delete(facility);
      else set.add(facility);
      return { ...prev, facilities: [...set] };
    });
  }

  function goBack() {
    setStep(STEPS[Math.max(stepIndex - 1, 0)].key);
  }

  async function continueFromManager() {
    if (!managerValid || inFlight.current) return;
    setStepErrors((prev) => ({ ...prev, manager: undefined }));

    if (managerMode === "existing") {
      setCreatedManager(null);
      setCreatedVenue(null);
      setStep("venue");
      return;
    }

    if (createdManager) {
      setStep("venue");
      return;
    }

    inFlight.current = true;
    setIsSubmitting(true);
    setManagerFieldErrors({});
    try {
      const created = await createVenueManager({
        firstName: managerDraft.firstName.trim(),
        lastName: managerDraft.lastName.trim(),
        email: managerDraft.email.trim(),
        phoneNumber:
          normalizePhoneForSubmit(
            managerDraft.phoneNumber,
            managerDraft.phoneCountryCode,
          ) ?? managerDraft.phoneNumber.trim(),
        tempPassword: managerDraft.tempPassword,
      });
      setCreatedManager(created);
      setSelectedManagerId(created.id);
      toast.success(`Venue Manager ${managerName(created)} created`);
      setStep("venue");
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, "Failed to create venue manager");
      const nextFieldErrors = venueManagerFieldErrors(err);
      setManagerFieldErrors(nextFieldErrors);
      if (isServerError(err)) toast.error(message);
      else setStepErrors((prev) => ({ ...prev, manager: message }));
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  }

  async function continueFromVenue() {
    if (!venueValid || inFlight.current) return;

    if (createdVenue) {
      setStep("review");
      return;
    }

    inFlight.current = true;
    setIsSubmitting(true);
    setStepErrors((prev) => ({ ...prev, venue: undefined }));
    const availabilityDays = venue.availability?.days ?? [];
    try {
      const created = await createVenue({
        ...venue,
        managerId: activeManagerId,
        // Backend rejects an availability object with zero days; omit instead.
        // Backend expects local venue minutes for the displayed operating day.
        availability:
          availabilityDays.length > 0 ? { days: availabilityDays } : undefined,
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
      });
      setCreatedVenue(created);
      toast.success(`Venue "${created.name}" created`);
      setStep("review");
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, "Failed to create venue");
      if (isServerError(err)) toast.error(message);
      else setStepErrors((prev) => ({ ...prev, venue: message }));
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  }

  function handlePrimaryAction() {
    if (step === "manager") void continueFromManager();
    if (step === "venue") void continueFromVenue();
    if (step === "review" && createdVenue) {
      router.push(`/dashboard/venues/${createdVenue.id}`);
    }
  }

  const primaryLabel =
    step === "manager"
      ? managerMode === "new" && !createdManager
        ? "Create and continue"
        : "Continue"
      : step === "venue"
        ? createdVenue
          ? "Review created venue"
          : "Create and review"
        : "Open venue";

  const primaryDisabled =
    isSubmitting ||
    (step === "manager" && !managerValid) ||
    (step === "venue" && !venueValid) ||
    (step === "review" && !createdVenue);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center gap-2 text-[12px] font-medium text-[var(--text-3)] transition-colors hover:text-[var(--text-1)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-[rgba(245,158,11,0.22)] bg-[rgba(245,158,11,0.08)] text-[var(--semantic-amber)]">
              <Sparkles className="h-4.5 w-4.5" />
            </span>
            <div>
              <h1 className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-1)]">
                Onboarding Venue Manager
              </h1>
              <p className="mt-1 text-[13.5px] text-[var(--text-3)]">
                Assign the manager, create the venue, and verify the records in
                one guided flow.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-5">
        <WizardProgress
          steps={STEPS}
          currentStep={step}
          stepIndex={stepIndex}
          progressPercent={progressPercent}
          onSelect={(nextStep, nextIndex) => {
            if (nextIndex <= stepIndex) setStep(nextStep);
          }}
        />

        <main className="min-w-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)]">
          <div key={step} className="onboarding-vm-step-panel min-h-[560px]">
            {step === "manager" && (
              <ManagerStep
                managerMode={managerMode}
                managers={managers}
                managersState={managersState}
                managerSearch={managerSearch}
                filteredManagers={filteredManagers}
                selectedManagerId={selectedManagerId}
                managerDraft={managerDraft}
                passwordScore={passwordScore}
                error={stepErrors.manager}
                fieldErrors={managerFieldErrors}
                createdManager={createdManager}
                onModeChange={(mode) => {
                  setManagerMode(mode);
                  setStepErrors((prev) => ({ ...prev, manager: undefined }));
                  setManagerFieldErrors({});
                  if (mode === "existing") {
                    setCreatedManager(null);
                    setCreatedVenue(null);
                  }
                }}
                onSearchChange={setManagerSearch}
                onSelectManager={(managerId) => {
                  setSelectedManagerId(managerId);
                  setCreatedManager(null);
                  setCreatedVenue(null);
                  setStepErrors((prev) => ({ ...prev, manager: undefined }));
                  setManagerFieldErrors({});
                }}
                onUpdateManager={updateManager}
              />
            )}

            {step === "venue" && (
              <VenueStep
                venue={venue}
                manager={activeManager}
                error={stepErrors.venue}
                createdVenue={createdVenue}
                onUpdateVenue={updateVenue}
                onToggleFacility={toggleFacility}
              />
            )}

            {step === "review" && (
              <ReviewStep
                managerMode={managerMode}
                manager={activeManager}
                venue={createdVenue}
              />
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={stepIndex === 0 || isSubmitting}
              className="border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-2)] hover:bg-[var(--bg-2)]"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              {!isSubmitting &&
                ((step === "manager" && !managerValid) ||
                  (step === "venue" && !venueValid)) && (
                  <span className="hidden text-[12px] text-[var(--text-4)] sm:inline">
                    Complete required fields (
                    <span className="text-[var(--semantic-red)]">*</span>) to
                    continue
                  </span>
                )}
              <Button
                type="button"
                onClick={handlePrimaryAction}
                disabled={primaryDisabled}
                className="bg-[linear-gradient(135deg,var(--teal),#00b894)] px-5 font-semibold text-[#06100d] shadow-[0_0_20px_-8px_var(--teal-glow)] hover:brightness-110"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Working...
                  </>
                ) : step === "review" ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {primaryLabel}
                  </>
                ) : (
                  <>
                    {primaryLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function ManagerStep({
  managerMode,
  managers,
  managersState,
  managerSearch,
  filteredManagers,
  selectedManagerId,
  managerDraft,
  passwordScore,
  error,
  fieldErrors,
  createdManager,
  onModeChange,
  onSearchChange,
  onSelectManager,
  onUpdateManager,
}: {
  managerMode: ManagerMode;
  managers: UserDto[];
  managersState: ManagersState;
  managerSearch: string;
  filteredManagers: UserDto[];
  selectedManagerId: string;
  managerDraft: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    phoneCountryCode: string;
    tempPassword: string;
  };
  passwordScore: 0 | 1 | 2 | 3 | 4;
  error?: string;
  fieldErrors: ManagerFieldErrors;
  createdManager: UserDto | null;
  onModeChange: (mode: ManagerMode) => void;
  onSearchChange: (value: string) => void;
  onSelectManager: (managerId: string) => void;
  onUpdateManager: <K extends keyof typeof managerDraft>(
    key: K,
    value: (typeof managerDraft)[K],
  ) => void;
}) {
  return (
    <section className="space-y-5 p-5">
      <SectionIntro
        eyebrow="Manager"
        title="Choose who owns this venue"
        body="Select an existing venue manager, or create the account before moving to the venue step."
      />
      <StepError message={error} />
      {createdManager && (
        <div className="flex items-center gap-3 rounded-lg border border-[rgba(16,185,129,0.24)] bg-[rgba(16,185,129,0.08)] px-4 py-3 text-[13px] text-[var(--text-2)]">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--semantic-green)]" />
          <span>
            Created account for{" "}
            <span className="font-medium text-[var(--text-1)]">
              {managerName(createdManager)}
            </span>
            .
          </span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <ModeButton
          active={managerMode === "existing"}
          icon={Search}
          title="Select existing"
          body={`${managers.length} manager${managers.length === 1 ? "" : "s"} available`}
          onClick={() => onModeChange("existing")}
          disabled={managersState === "ready" && managers.length === 0}
        />
        <ModeButton
          active={managerMode === "new"}
          icon={UserPlus}
          title="Create new"
          body="Create credentials before the venue is created"
          onClick={() => onModeChange("new")}
        />
      </div>

      {managerMode === "existing" ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-4)]" />
            <Input
              value={managerSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search managers by name, email, or phone"
              className={cn(fieldClass, "pl-9")}
            />
          </div>

          <div className="grid gap-2">
            {managersState === "loading" && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-2)] p-4 text-[13px] text-[var(--text-3)]">
                Loading venue managers...
              </div>
            )}
            {managersState === "error" && (
              <div className="rounded-lg border border-[rgba(244,63,94,0.2)] bg-[rgba(244,63,94,0.08)] p-4 text-[13px] text-[var(--semantic-red)]">
                Could not load venue managers. You can still create a new
                manager in this flow.
              </div>
            )}
            {managersState === "ready" &&
              filteredManagers.map((manager) => (
                <button
                  key={manager.id}
                  type="button"
                  onClick={() => onSelectManager(manager.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                    selectedManagerId === manager.id
                      ? "border-[rgba(0,212,170,0.3)] bg-[rgba(0,212,170,0.08)]"
                      : "border-[var(--border)] bg-[var(--bg-0)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)]",
                  )}
                >
                  <AvatarLabel name={managerName(manager)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-[var(--text-1)]">
                      {managerName(manager)}
                    </span>
                    <span className="block truncate font-mono text-[12px] text-[var(--text-4)]">
                      {manager.email}
                    </span>
                  </span>
                  {selectedManagerId === manager.id && (
                    <CheckCircle2 className="h-4 w-4 text-[var(--teal-text)]" />
                  )}
                </button>
              ))}
            {managersState === "ready" && filteredManagers.length === 0 && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-2)] p-4 text-[13px] text-[var(--text-3)]">
                No manager matches that search.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name" required error={fieldErrors.firstName}>
              <Input
                value={managerDraft.firstName}
                onChange={(e) => onUpdateManager("firstName", e.target.value)}
                placeholder="Jane"
                className={fieldClass}
              />
            </Field>
            <Field label="Last name" required error={fieldErrors.lastName}>
              <Input
                value={managerDraft.lastName}
                onChange={(e) => onUpdateManager("lastName", e.target.value)}
                placeholder="Smith"
                className={fieldClass}
              />
            </Field>
            <Field label="Email" required error={fieldErrors.email}>
              <Input
                type="email"
                value={managerDraft.email}
                onChange={(e) => onUpdateManager("email", e.target.value)}
                placeholder="manager@venue.com"
                className={fieldClass}
              />
            </Field>
            <div className="space-y-1.5">
              <PhoneNumberField
                countryCode={managerDraft.phoneCountryCode}
                phoneNumber={managerDraft.phoneNumber}
                onCountryCodeChange={(countryCode) =>
                  onUpdateManager("phoneCountryCode", countryCode)
                }
                onPhoneNumberChange={(value) =>
                  onUpdateManager("phoneNumber", value)
                }
                phoneLabel="Phone"
                inputClassName={fieldClass}
                labelClassName={labelClass}
                required
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
          <TempPasswordField
            value={managerDraft.tempPassword}
            onChange={(value) => onUpdateManager("tempPassword", value)}
            strength={passwordScore}
          />
          {fieldErrors.tempPassword && (
            <p
              role="alert"
              className="text-[11px] leading-[1.4] text-[var(--semantic-red)]"
            >
              {fieldErrors.tempPassword}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function VenueStep({
  venue,
  manager,
  error,
  createdVenue,
  onUpdateVenue,
  onToggleFacility,
}: {
  venue: CreateVenueRequest;
  manager?: UserDto;
  error?: string;
  createdVenue: VenueDetailResponse | null;
  onUpdateVenue: <K extends keyof CreateVenueRequest>(
    key: K,
    value: CreateVenueRequest[K],
  ) => void;
  onToggleFacility: (facility: Facility) => void;
}) {
  const paymentModesLabelId = useId();
  const recurringBookingsId = useId();
  const recurringBookingsHelpId = useId();
  const facilitiesLabelId = useId();
  const timeZoneId = useId();

  return (
    <section className="space-y-5 p-5">
      <SectionIntro
        eyebrow="Venue"
        title="Create the venue workspace"
        body="Add the profile, operating defaults, and facilities. This step creates the venue before review."
      />
      <StepError message={error} />
      {manager && (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-0)] px-4 py-3">
          <AvatarLabel name={managerName(manager)} />
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-[var(--text-1)]">
              {managerName(manager)}
            </div>
            <div className="truncate font-mono text-[12px] text-[var(--text-4)]">
              {manager.email}
            </div>
          </div>
        </div>
      )}
      {createdVenue && (
        <div className="flex items-center gap-3 rounded-lg border border-[rgba(16,185,129,0.24)] bg-[rgba(16,185,129,0.08)] px-4 py-3 text-[13px] text-[var(--text-2)]">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--semantic-green)]" />
          <span>
            Created venue{" "}
            <span className="font-medium text-[var(--text-1)]">
              {createdVenue.name}
            </span>
            .
          </span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Venue name (English)" required>
          <Input
            value={venue.nameEn}
            onChange={(e) => onUpdateVenue("nameEn", e.target.value)}
            placeholder="Arena Sports Complex"
            className={fieldClass}
          />
        </Field>
        <Field label="Venue name (Arabic)" required>
          <Input
            dir="rtl"
            lang="ar"
            value={venue.nameAr}
            onChange={(e) => onUpdateVenue("nameAr", e.target.value)}
            placeholder="مجمّع الأرينا الرياضي"
            className={fieldClass}
          />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea
            value={venue.description ?? ""}
            onChange={(e) => onUpdateVenue("description", e.target.value)}
            placeholder="Short operational description"
            rows={3}
            className={cn(fieldClass, "min-h-24")}
          />
        </Field>
        <Field label="Contact email" required>
          <Input
            type="email"
            value={venue.contactEmail ?? ""}
            onChange={(e) => onUpdateVenue("contactEmail", e.target.value)}
            placeholder="frontdesk@venue.com"
            className={fieldClass}
          />
        </Field>
        <Field label="Address" required className="sm:col-span-2">
          <Input
            value={venue.addressLine}
            onChange={(e) => onUpdateVenue("addressLine", e.target.value)}
            placeholder="Full street address"
            className={fieldClass}
          />
        </Field>
        <VenueLocationFields
          className="sm:col-span-2"
          city={venue.city}
          latitude={venue.latitude}
          longitude={venue.longitude}
          onCityChange={(city) => onUpdateVenue("city", city)}
          onCoordinatesChange={({ latitude, longitude }) => {
            onUpdateVenue("latitude", latitude);
            onUpdateVenue("longitude", longitude);
          }}
          inputClassName={fieldClass}
          labelClassName={labelClass}
        />
        <PhoneNumberField
          countryCode={venue.countryCode}
          phoneNumber={venue.contactPhone ?? ""}
          onCountryCodeChange={(countryCode) => {
            onUpdateVenue("countryCode", countryCode);
            onUpdateVenue(
              "contactPhone",
              phoneValueForCountry(venue.contactPhone, countryCode),
            );
          }}
          onPhoneNumberChange={(value) => onUpdateVenue("contactPhone", value)}
          phoneLabel="Contact phone"
          required
          inputClassName={fieldClass}
          labelClassName={labelClass}
        />
      </div>

      <div className="space-y-4 border-t border-[var(--border)] pt-5">
        <div>
          <div id={paymentModesLabelId} className={labelClass}>
            Payment mode
            <span className="ml-1 text-[var(--semantic-red)]">*</span>
          </div>
          <div
            role="radiogroup"
            aria-labelledby={paymentModesLabelId}
            className="mt-2 grid gap-3 md:grid-cols-3"
          >
            {PAYMENT_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                role="radio"
                aria-checked={venue.paymentMode === mode.value}
                onClick={() => onUpdateVenue("paymentMode", mode.value)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-all",
                  venue.paymentMode === mode.value
                    ? "border-[rgba(0,212,170,0.3)] bg-[rgba(0,212,170,0.08)]"
                    : "border-[var(--border)] bg-[var(--bg-0)] hover:border-[var(--border-strong)]",
                )}
              >
                <span className="block text-[13px] font-semibold text-[var(--text-1)]">
                  {mode.label}
                </span>
                <span className="mt-1 block text-[12px] leading-5 text-[var(--text-3)]">
                  {mode.note}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={timeZoneId} className={labelClass}>
            Time zone
            <span className="ml-1 text-[var(--semantic-red)]">*</span>
          </Label>
          <TimezoneSelect
            id={timeZoneId}
            value={venue.timeZoneId}
            onChange={(value) => onUpdateVenue("timeZoneId", value)}
            triggerClassName={fieldClass}
          />
          <p className="text-[12px] text-[var(--text-4)]">
            Operating hours below are interpreted in this zone.
          </p>
        </div>

        <VenueAvailabilityEditor
          days={venue.availability?.days ?? []}
          onChange={(days) => onUpdateVenue("availability", { days })}
          inputClassName={fieldClass}
          labelClassName={labelClass}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Currency" required>
            <select
              value={venue.currencyCode}
              onChange={(e) => onUpdateVenue("currencyCode", e.target.value)}
              className={cn(
                "h-9 w-full rounded-md border px-3 text-sm outline-none transition-all",
                fieldClass,
              )}
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Max advance booking days" required>
            <Input
              type="number"
              min={1}
              max={365}
              value={venue.maxAdvanceBookingDays}
              onChange={(e) =>
                onUpdateVenue(
                  "maxAdvanceBookingDays",
                  parseInt(e.target.value) || 30,
                )
              }
              className={fieldClass}
            />
          </Field>
          <Field label="Court limit" required>
            <Input
              type="number"
              min={1}
              max={1000}
              value={venue.courtLimit ?? ""}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                onUpdateVenue(
                  "courtLimit",
                  Number.isFinite(parsed) ? parsed : undefined,
                );
              }}
              placeholder="e.g. 8"
              className={fieldClass}
            />
          </Field>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-0)] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <label
                htmlFor={recurringBookingsId}
                className="text-[14px] font-medium text-[var(--text-1)]"
              >
                Recurring bookings
              </label>
              <div
                id={recurringBookingsHelpId}
                className="mt-1 text-[12px] text-[var(--text-3)]"
              >
                Allow customers to book repeated sessions.
              </div>
            </div>
            <Switch
              id={recurringBookingsId}
              aria-describedby={recurringBookingsHelpId}
              checked={venue.allowRecurringBookings}
              onCheckedChange={(checked) =>
                onUpdateVenue("allowRecurringBookings", checked)
              }
            />
          </div>
        </div>

        <div>
          <Label id={facilitiesLabelId} className={labelClass}>
            Facilities
          </Label>
          <div
            role="group"
            aria-labelledby={facilitiesLabelId}
            className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3"
          >
            {FACILITIES.map((facility) => {
              const active = (venue.facilities ?? []).includes(facility.value);
              return (
                <button
                  key={facility.value}
                  type="button"
                  onClick={() => onToggleFacility(facility.value)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-md border px-3 py-2 text-[12.5px] font-medium transition-all",
                    active
                      ? "border-[rgba(0,212,170,0.3)] bg-[rgba(0,212,170,0.08)] text-[var(--teal-text)]"
                      : "border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-3)] hover:border-[var(--border-strong)] hover:text-[var(--text-1)]",
                  )}
                >
                  {facility.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewStep({
  managerMode,
  manager,
  venue,
}: {
  managerMode: ManagerMode;
  manager?: UserDto;
  venue: VenueDetailResponse | null;
}) {
  return (
    <section className="space-y-5 p-5">
      <SectionIntro
        eyebrow="Review"
        title="Check the created records"
        body="The account and venue have already been submitted. Review the returned data before opening the venue."
      />
      <div className="grid gap-3 md:grid-cols-2">
        <ReviewBlock
          title="Venue manager"
          rows={[
            [
              "Mode",
              managerMode === "new"
                ? "Created new manager"
                : "Selected existing manager",
            ],
            ["Name", manager ? managerName(manager) : "Not available"],
            ["Email", manager?.email ?? "Not available"],
            ["Status", manager?.status ?? "Not available"],
          ]}
        />
        <ReviewBlock
          title="Created venue"
          rows={[
            ["ID", venue?.id ?? "Not available"],
            ["Name", venue?.name ?? "Not available"],
            ["City", venue?.city ?? "Not available"],
            ["Country", venue?.countryCode ?? "Not available"],
            ["Time zone", venue?.timeZoneId ?? "Not available"],
            ["Currency", venue?.currencyCode ?? "Not available"],
            [
              "Court limit",
              venue?.courtLimit != null
                ? String(venue.courtLimit)
                : "Not available",
            ],
            ["Status", venue?.status ?? "Not available"],
          ]}
        />
      </div>
      <div className="rounded-lg border border-[rgba(245,158,11,0.18)] bg-[rgba(245,158,11,0.08)] px-4 py-3 text-[13px] leading-6 text-[var(--text-2)]">
        New venue managers receive the temporary password you set. Share it
        through a secure channel after this flow completes.
      </div>
    </section>
  );
}

function WizardProgress({
  steps,
  currentStep,
  stepIndex,
  progressPercent,
  onSelect,
}: {
  steps: typeof STEPS;
  currentStep: StepKey;
  stepIndex: number;
  progressPercent: number;
  onSelect: (step: StepKey, index: number) => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-1)] px-4 py-4">
      <div className="relative">
        <div className="absolute left-0 right-0 top-5 h-px bg-[var(--border)]" />
        <div
          className="absolute left-0 right-0 top-5 h-px origin-left bg-[linear-gradient(90deg,var(--teal),var(--semantic-amber))] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ transform: `scaleX(${progressPercent / 100})` }}
          aria-hidden="true"
        />
        <div className="relative grid grid-cols-3 gap-2">
          {steps.map((item, index) => {
            const Icon = item.icon;
            const active = item.key === currentStep;
            const complete = index < stepIndex;
            const reachable = index <= stepIndex;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelect(item.key, index)}
                disabled={!reachable}
                aria-current={active ? "step" : undefined}
                className="group flex min-w-0 flex-col items-center gap-2 disabled:cursor-not-allowed"
              >
                <span
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-full border transition-all duration-200",
                    complete
                      ? "border-[rgba(16,185,129,0.28)] bg-[rgba(16,185,129,0.1)] text-[var(--semantic-green)]"
                      : active
                        ? "scale-[1.04] border-[rgba(0,212,170,0.34)] bg-[rgba(0,212,170,0.12)] text-[var(--teal-text)] shadow-[0_0_22px_-10px_var(--teal-glow)]"
                        : "border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-4)]",
                  )}
                >
                  {complete ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </span>
                <span className="min-w-0 text-center">
                  <span
                    className={cn(
                      "block text-[10px] font-semibold uppercase tracking-[0.08em]",
                      active
                        ? "text-[var(--teal-text)]"
                        : "text-[var(--text-4)]",
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="mt-0.5 hidden truncate text-[12px] font-medium text-[var(--text-2)] sm:block">
                    {item.title}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SectionIntro({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--teal-text)]">
        {eyebrow}
      </div>
      <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.015em] text-[var(--text-1)]">
        {title}
      </h2>
      <p className="mt-1 max-w-2xl text-[13.5px] leading-6 text-[var(--text-3)]">
        {body}
      </p>
    </div>
  );
}

function StepError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-lg border border-[rgba(244,63,94,0.24)] bg-[rgba(244,63,94,0.08)] px-4 py-3 text-[13px] leading-6 text-[var(--text-2)]"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--semantic-red)]" />
      <div>
        <div className="font-medium text-[var(--semantic-red)]">
          This step needs attention
        </div>
        <div className="mt-0.5 text-[var(--text-3)]">{message}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const field = isValidElement<FieldChildProps>(children)
    ? cloneElement(children as ReactElement<FieldChildProps>, {
        id: children.props.id ?? inputId,
        "aria-required": required ? true : children.props["aria-required"],
        "aria-invalid": Boolean(error) || children.props["aria-invalid"],
        "aria-describedby": error
          ? errorId
          : children.props["aria-describedby"],
      })
    : children;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={inputId} className={labelClass}>
        {label}
        {required && <span className="ml-1 text-[var(--semantic-red)]">*</span>}
      </Label>
      {field}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-[11px] leading-[1.4] text-[var(--semantic-red)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}

type FieldChildProps = {
  id?: string;
  "aria-required"?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

function ModeButton({
  active,
  disabled,
  icon: Icon,
  title,
  body,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: typeof UserCog;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-lg border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-45",
        active
          ? "border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)]"
          : "border-[var(--border)] bg-[var(--bg-0)] hover:border-[var(--border-strong)]",
      )}
    >
      <Icon
        className={cn(
          "mb-3 h-4 w-4",
          active ? "text-[var(--semantic-amber)]" : "text-[var(--text-4)]",
        )}
      />
      <span className="block text-[14px] font-semibold text-[var(--text-1)]">
        {title}
      </span>
      <span className="mt-1 block text-[12px] leading-5 text-[var(--text-3)]">
        {body}
      </span>
    </button>
  );
}

function AvatarLabel({ name }: { name: string }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.08)] font-mono text-[12px] font-bold text-[var(--semantic-amber)]">
      {initials(name)}
    </span>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-[var(--border)] pt-2">
      <span className="text-[12px] text-[var(--text-4)]">{label}</span>
      <span className="truncate text-right text-[12.5px] font-medium text-[var(--text-2)]">
        {value}
      </span>
    </div>
  );
}

function ReviewBlock({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-0)] p-4">
      <div className="text-[14px] font-semibold text-[var(--text-1)]">
        {title}
      </div>
      <div className="mt-3 space-y-2">
        {rows.map(([label, value]) => (
          <SummaryRow key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}
