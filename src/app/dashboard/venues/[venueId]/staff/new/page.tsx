"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  BadgePercent,
  BellRing,
  Building2,
  CalendarCheck,
  ChartNoAxesCombined,
  ContactRound,
  Eye,
  Grid2X2,
  Info,
  Mail,
  MapPin,
  User,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createVenueStaff,
  getApiErrorMessage,
  getApiErrorStatus,
  getApiFieldErrors,
  getVenue,
} from "@/lib/api";
import { normalizeEmail } from "@/lib/email";
import type {
  StaffPermission,
  VenueDetailResponse,
} from "@/types/api";
import { BackLink } from "@/app/dashboard/users/create/_components/back-link";
import {
  FormFooter,
  FormSection,
  PreviewCard,
  PreviewRow,
  TextField,
} from "@/app/dashboard/users/create/_components/form-primitives";
import {
  generatePassword,
  passwordStrength,
  TempPasswordField,
} from "@/app/dashboard/users/create/_components/temp-password-field";
import { useSubmitShortcut } from "@/app/dashboard/users/create/_components/use-submit-shortcut";
import { CredentialsMessage } from "@/app/dashboard/users/create/_components/credentials-message";

const ACCENT = "amber" as const;
const FORM_ID = "create-venue-staff-form";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

interface PermissionOption {
  value: StaffPermission;
  label: string;
  description: string;
}

const PERMISSION_GROUPS: Array<{
  label: string;
  icon: typeof Eye;
  options: PermissionOption[];
}> = [
  {
    label: "Venue",
    icon: Building2,
    options: [
      { value: "VENUE_READ", label: "View venue", description: "See venue details and settings." },
      { value: "VENUE_WRITE", label: "Edit venue", description: "Update venue details and settings." },
    ],
  },
  {
    label: "Courts",
    icon: Grid2X2,
    options: [
      { value: "COURTS_READ", label: "View courts", description: "See courts, schedules, and pricing." },
      { value: "COURTS_WRITE", label: "Manage courts", description: "Create and update court setup." },
      { value: "COURTS_DELETE", label: "Delete courts", description: "Remove courts from the venue." },
    ],
  },
  {
    label: "Bookings",
    icon: CalendarCheck,
    options: [
      { value: "BOOKINGS_READ", label: "View bookings", description: "See booking details and schedules." },
      { value: "BOOKINGS_WRITE", label: "Manage bookings", description: "Create and update bookings." },
      { value: "BOOKINGS_APPROVE", label: "Approve bookings", description: "Approve pending booking requests." },
      { value: "BOOKINGS_CANCEL", label: "Cancel bookings", description: "Cancel existing bookings." },
      { value: "BOOKINGS_DELETE", label: "Delete bookings", description: "Permanently remove bookings." },
    ],
  },
  {
    label: "Customers",
    icon: ContactRound,
    options: [
      { value: "CUSTOMERS_READ", label: "View customers", description: "See customer profiles and activity." },
      { value: "CUSTOMERS_WRITE", label: "Manage customers", description: "Update customer information." },
      { value: "CUSTOMERS_BLOCK", label: "Block customers", description: "Restrict customers from booking." },
    ],
  },
  {
    label: "Promotions",
    icon: BadgePercent,
    options: [
      { value: "PROMOTIONS_READ", label: "View promotions", description: "See promotions and eligibility." },
      { value: "PROMOTIONS_WRITE", label: "Manage promotions", description: "Create and update promotions." },
      { value: "PROMOTIONS_DELETE", label: "Delete promotions", description: "Remove promotions." },
    ],
  },
  {
    label: "Finance",
    icon: WalletCards,
    options: [
      { value: "FINANCE_READ", label: "View finance", description: "See financial records and balances." },
      { value: "FINANCE_WRITE", label: "Manage finance", description: "Update financial records." },
    ],
  },
  {
    label: "Reports",
    icon: ChartNoAxesCombined,
    options: [
      { value: "REPORTS_READ", label: "View reports", description: "Open operational reports." },
    ],
  },
  {
    label: "Notifications",
    icon: BellRing,
    options: [
      { value: "NOTIFICATIONS_READ", label: "View notifications", description: "See venue notifications." },
      { value: "NOTIFICATIONS_WRITE", label: "Manage notifications", description: "Create and update notifications." },
      { value: "NOTIFICATIONS_SEND", label: "Send notifications", description: "Send notifications to recipients." },
    ],
  },
];

const ALL_STAFF_PERMISSIONS = PERMISSION_GROUPS.flatMap((group) =>
  group.options.map((option) => option.value),
);

const PERMISSION_PRESETS: Array<{
  label: string;
  description: string;
  permissions: StaffPermission[];
}> = [
  {
    label: "Basic",
    description: "Daily venue operations",
    permissions: [
      "VENUE_READ",
      "COURTS_READ",
      "COURTS_WRITE",
      "BOOKINGS_READ",
      "BOOKINGS_WRITE",
      "BOOKINGS_APPROVE",
      "FINANCE_READ",
      "REPORTS_READ",
    ],
  },
  {
    label: "Bookings only",
    description: "Booking desk access",
    permissions: [
      "BOOKINGS_READ",
      "BOOKINGS_WRITE",
      "BOOKINGS_APPROVE",
      "BOOKINGS_CANCEL",
      "CUSTOMERS_READ",
    ],
  },
  {
    label: "Manager",
    description: "All 22 permissions",
    permissions: ALL_STAFF_PERMISSIONS,
  },
];

function hasSamePermissions(
  current: StaffPermission[],
  expected: StaffPermission[],
): boolean {
  return (
    current.length === expected.length &&
    expected.every((permission) => current.includes(permission))
  );
}

type FieldName =
  | "firstName"
  | "lastName"
  | "email"
  | "tempPassword"
  | "permissions";
type FieldErrors = Partial<Record<FieldName, string>>;

function validateFields(values: {
  firstName: string;
  lastName: string;
  email: string;
  tempPassword: string;
  permissions: StaffPermission[];
}): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.firstName.trim()) errors.firstName = "First name is required.";
  if (!values.lastName.trim()) errors.lastName = "Last name is required.";

  const email = normalizeEmail(values.email);
  if (!email) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.tempPassword) {
    errors.tempPassword = "Temporary password is required.";
  } else if (values.tempPassword.length < MIN_PASSWORD_LENGTH) {
    errors.tempPassword = "Use at least 8 characters.";
  }

  if (values.permissions.length === 0) {
    errors.permissions = "Select at least one permission.";
  }
  return errors;
}

function mapApiFieldErrors(err: unknown): FieldErrors {
  const mapped: FieldErrors = {};
  for (const fieldError of getApiFieldErrors(err)) {
    if (
      fieldError.field === "firstName" ||
      fieldError.field === "lastName" ||
      fieldError.field === "email" ||
      fieldError.field === "tempPassword"
    ) {
      mapped[fieldError.field] = fieldError.message;
    } else if (fieldError.field.startsWith("venueAssignments")) {
      mapped.permissions = fieldError.message;
    }
  }
  return mapped;
}

export default function CreateVenueStaffPage() {
  const params = useParams<{ venueId: string }>();
  const [venue, setVenue] = useState<VenueDetailResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [permissions, setPermissions] = useState<StaffPermission[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    tempPassword: string;
  } | null>(null);
  const inFlight = useRef(false);

  useSubmitShortcut(FORM_ID);

  useEffect(() => {
    setTempPassword((current) => current || generatePassword());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    getVenue(params.venueId)
      .then((data) => {
        if (!cancelled) setVenue(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            getApiErrorMessage(err, "Couldn't load this venue. Try again."),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.venueId]);

  const strength = useMemo(
    () => passwordStrength(tempPassword),
    [tempPassword],
  );

  const clearFieldError = useCallback((field: FieldName) => {
    setSubmitError(null);
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  function togglePermission(permission: StaffPermission, checked: boolean) {
    setPermissions((current) =>
      checked
        ? [...new Set([...current, permission])]
        : current.filter((item) => item !== permission),
    );
    clearFieldError("permissions");
  }

  function setPermissionGroup(group: PermissionOption[], checked: boolean) {
    const groupPermissions = group.map((option) => option.value);
    setPermissions((current) =>
      checked
        ? [...new Set([...current, ...groupPermissions])]
        : current.filter((permission) => !groupPermissions.includes(permission)),
    );
    clearFieldError("permissions");
  }

  function applyPreset(preset: StaffPermission[]) {
    setPermissions([...preset]);
    clearFieldError("permissions");
  }

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!venue || inFlight.current) return;

      const nextErrors = validateFields({
        firstName,
        lastName,
        email,
        tempPassword,
        permissions,
      });
      setFieldErrors(nextErrors);
      setSubmitError(null);
      if (Object.keys(nextErrors).length > 0) {
        toast.error("Check the highlighted fields and try again.");
        return;
      }

      if (!venue.managerId) {
        setSubmitError(
          "This venue has no manager. Assign a venue manager before creating staff.",
        );
        return;
      }

      const numericVenueId = Number(venue.id);
      if (!Number.isSafeInteger(numericVenueId) || numericVenueId <= 0) {
        setSubmitError("This venue has an invalid ID and cannot receive staff.");
        return;
      }

      inFlight.current = true;
      setIsSubmitting(true);
      try {
        const created = await createVenueStaff(venue.managerId, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizeEmail(email),
          tempPassword,
          venueAssignments: [
            { venueId: numericVenueId, permissions: [...permissions] },
          ],
        });
        const displayName =
          `${created.user.firstName} ${created.user.lastName}`.trim() ||
          created.user.email;
        toast.success(created.message, {
          description: `${displayName} can now access ${venue.name}.`,
        });
        setCreatedCredentials({
          name: displayName,
          email: created.user.email,
          tempPassword,
        });
      } catch (err: unknown) {
        const status = getApiErrorStatus(err);
        const message =
          status === 409
            ? "Email already in use"
            : status === 404
              ? "The venue manager or venue assignment is no longer valid."
              : getApiErrorMessage(err, "Failed to create staff user");
        const mappedErrors = mapApiFieldErrors(err);
        if (status === 409) mappedErrors.email = message;
        setFieldErrors(mappedErrors);
        if (Object.keys(mappedErrors).length === 0) setSubmitError(message);
        toast.error(
          Object.keys(mappedErrors).length > 0
            ? "Check the highlighted fields and try again."
            : message,
        );
      } finally {
        inFlight.current = false;
        setIsSubmitting(false);
      }
    },
    [email, firstName, lastName, permissions, tempPassword, venue],
  );

  if (isLoading) {
    return (
      <div className="users-create-v2 space-y-4">
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-16 w-full max-w-xl rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <Skeleton className="h-[620px] rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
      </div>
    );
  }

  if (loadError || !venue) {
    return (
      <div className="users-create-v2 max-w-xl">
        <BackLink href="/dashboard/venues" label="Venues" />
        <div className="rounded-lg border border-[var(--semantic-red-subtle)] bg-[var(--semantic-red-subtle)] p-5">
          <h1 className="text-[16px] font-semibold text-[var(--text-1)]">
            Venue unavailable
          </h1>
          <p className="mt-1.5 text-[13px] leading-5 text-[var(--text-3)]">
            {loadError ?? "This venue could not be found."}
          </p>
        </div>
      </div>
    );
  }

  if (!venue.managerId) {
    return (
      <div className="users-create-v2 max-w-xl">
        <BackLink
          href={`/dashboard/venues/${venue.id}`}
          label={venue.name}
        />
        <div className="rounded-lg border border-[var(--semantic-amber-subtle)] bg-[var(--semantic-amber-subtle)] p-5">
          <h1 className="text-[16px] font-semibold text-[var(--text-1)]">
            Assign a manager first
          </h1>
          <p className="mt-1.5 text-[13px] leading-5 text-[var(--text-3)]">
            Staff accounts belong to a venue manager. Return to the venue and
            assign its manager before creating staff.
          </p>
        </div>
      </div>
    );
  }

  if (createdCredentials) {
    return (
      <div className="users-create-v2 max-w-3xl space-y-5">
        <BackLink href={`/dashboard/venues/${venue.id}`} label={venue.name} />
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[rgba(16,185,129,0.12)] text-[var(--semantic-green)]">
            <Users className="h-4.5 w-4.5" />
          </span>
          <div>
            <h1 className="text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-1)]">
              Staff account created
            </h1>
            <p className="mt-1.5 text-[13.5px] text-[var(--text-3)]">
              {createdCredentials.name} can now access {venue.name}.
            </p>
          </div>
        </div>
        <CredentialsMessage
          name={createdCredentials.name}
          email={createdCredentials.email}
          tempPassword={createdCredentials.tempPassword}
          accountType="staff"
        />
        <Link
          href={`/dashboard/venues/${venue.id}`}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[var(--teal)] px-4 text-[13px] font-semibold text-[#06100d] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--teal-subtle)]"
        >
          Return to venue
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const activePreset = PERMISSION_PRESETS.find((preset) =>
    hasSamePermissions(permissions, preset.permissions),
  );
  const previewName =
    `${firstName.trim() || "First"} ${lastName.trim() || "Last"}`.trim();
  const previewEmail = normalizeEmail(email) || "staff@venue.com";

  return (
    <div className="users-create-v2 space-y-0">
      <BackLink href={`/dashboard/venues/${venue.id}`} label={venue.name} />

      <div className="mb-7">
        <h1 className="mb-1.5 text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-1)]">
          Create venue staff
        </h1>
        <p className="max-w-[70ch] text-[13.5px] tracking-[-0.003em] text-[var(--text-3)]">
          Add a staff account for {venue.name}. Access is limited to the
          venue permissions you select below.
        </p>
      </div>

      <form id={FORM_ID} onSubmit={handleSubmit} noValidate>
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="uv2c-card overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-1)]">
            <FormSection
              step={1}
              accent={ACCENT}
              label="Staff account"
              title="Who needs access?"
              desc="Their name and email identify them in venue operations."
            >
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <TextField
                  label="First name"
                  required
                  icon={User}
                  accent={ACCENT}
                  value={firstName}
                  onChange={(value) => {
                    setFirstName(value);
                    clearFieldError("firstName");
                  }}
                  placeholder="Maya"
                  error={fieldErrors.firstName}
                />
                <TextField
                  label="Last name"
                  required
                  icon={User}
                  accent={ACCENT}
                  value={lastName}
                  onChange={(value) => {
                    setLastName(value);
                    clearFieldError("lastName");
                  }}
                  placeholder="Haddad"
                  error={fieldErrors.lastName}
                />
              </div>
              <div className="mt-3.5">
                <TextField
                  label="Email address"
                  required
                  icon={Mail}
                  type="email"
                  accent={ACCENT}
                  value={email}
                  onChange={(value) => {
                    setEmail(value);
                    clearFieldError("email");
                  }}
                  placeholder="maya@example.com"
                  error={fieldErrors.email}
                />
              </div>
            </FormSection>

            <FormSection
              step={2}
              accent={ACCENT}
              label="First login"
              title="Set a temporary password"
              desc="The staff member must replace it the first time they sign in."
            >
              <TempPasswordField
                value={tempPassword}
                onChange={(value) => {
                  setTempPassword(value);
                  clearFieldError("tempPassword");
                }}
                strength={strength}
                error={fieldErrors.tempPassword}
                recipientLabel="staff member"
              />
            </FormSection>

            <FormSection
              step={3}
              accent={ACCENT}
              label="Venue access"
              title={`What can they do at ${venue.name}?`}
              desc="Start with a preset, then adjust individual permissions if needed."
            >
              <div className="mb-3.5 flex items-start gap-2.5 rounded-md border border-[var(--border)] bg-[var(--bg-0)] px-3.5 py-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--semantic-amber)]" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[var(--text-1)]">
                    {venue.name}
                  </p>
                  <p className="mt-0.5 font-mono text-[10.5px] text-[var(--text-4)]">
                    Venue #{venue.id} · Manager #{venue.managerId}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]">
                    Access presets
                  </p>
                  <span className="font-mono text-[10.5px] text-[var(--text-4)]">
                    {permissions.length} / {ALL_STAFF_PERMISSIONS.length} selected
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {PERMISSION_PRESETS.map((preset) => {
                    const active = hasSamePermissions(
                      permissions,
                      preset.permissions,
                    );
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        aria-pressed={active}
                        onClick={() => applyPreset(preset.permissions)}
                        className={`rounded-md border px-3 py-2.5 text-left transition-colors ${
                          active
                            ? "border-[rgba(245,158,11,0.3)] bg-[var(--semantic-amber-subtle)]"
                            : "border-[var(--border)] bg-[var(--bg-0)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)]"
                        }`}
                      >
                        <span className="block text-[12.5px] font-semibold text-[var(--text-1)]">
                          {preset.label}
                        </span>
                        <span className="mt-0.5 block text-[10.5px] text-[var(--text-4)]">
                          {preset.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-0)] divide-y divide-[var(--border)]"
                aria-describedby={
                  fieldErrors.permissions ? "staff-permissions-error" : undefined
                }
              >
                {PERMISSION_GROUPS.map((group) => {
                  const Icon = group.icon;
                  const selectedInGroup = group.options.filter((option) =>
                    permissions.includes(option.value),
                  ).length;
                  const allSelected = selectedInGroup === group.options.length;
                  return (
                    <fieldset key={group.label} className="p-3.5">
                      <legend className="sr-only">{group.label} permissions</legend>
                      <div className="mb-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-[var(--semantic-amber)]" />
                          <span className="text-[12.5px] font-semibold text-[var(--text-1)]">
                            {group.label}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--text-4)]">
                            {selectedInGroup}/{group.options.length}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPermissionGroup(group.options, !allSelected)}
                          className="text-[10.5px] font-medium text-[var(--semantic-amber)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-amber-subtle)]"
                        >
                          {allSelected ? "Clear group" : "Select group"}
                        </button>
                      </div>
                      <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                        {group.options.map((option) => {
                          const checked = permissions.includes(option.value);
                          return (
                            <label
                              key={option.value}
                              className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-[var(--bg-2)]"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(nextChecked) =>
                                  togglePermission(option.value, nextChecked)
                                }
                                aria-invalid={Boolean(fieldErrors.permissions) || undefined}
                                className="mt-0.5 data-checked:border-[var(--semantic-amber)] data-checked:bg-[var(--semantic-amber)] data-checked:text-[var(--bg-0)]"
                              />
                              <span className="min-w-0">
                                <span className="block text-[11.75px] font-medium text-[var(--text-1)]">
                                  {option.label}
                                </span>
                                <span className="mt-0.5 block text-[10.5px] leading-[1.4] text-[var(--text-4)]">
                                  {option.description}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}
              </div>
              <p className="mt-2 text-[10.5px] leading-4 text-[var(--text-4)]">
                Staff administration and non-assignable mobile permissions are intentionally excluded.
              </p>
              {fieldErrors.permissions && (
                <p
                  id="staff-permissions-error"
                  role="alert"
                  className="mt-2 text-[11px] text-[var(--semantic-red)]"
                >
                  {fieldErrors.permissions}
                </p>
              )}

              {submitError && (
                <div
                  role="alert"
                  className="mt-3.5 flex items-start gap-2 rounded-md border border-[var(--semantic-red-subtle)] bg-[var(--semantic-red-subtle)] px-3 py-2.5 text-[11.5px] leading-5 text-[var(--semantic-red)]"
                >
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {submitError}
                </div>
              )}
            </FormSection>

            <FormFooter
              accent={ACCENT}
              submitting={isSubmitting}
              canSubmit={!isSubmitting}
              submitLabel="Create staff"
              submitIcon={Users}
              cancelHref={`/dashboard/venues/${venue.id}`}
            />
          </div>

          <PreviewCard
            accent={ACCENT}
            initials={`${firstName[0] ?? "M"}${lastName[0] ?? "H"}`.toUpperCase()}
            name={previewName}
            email={previewEmail}
            badgeLabel="Venue staff"
            badgeIcon={Users}
          >
            <div className="flex flex-col gap-2">
              <PreviewRow label="Venue" value={venue.name} />
              <PreviewRow
                label="Permissions"
                value={
                  permissions.length > 0
                    ? activePreset
                      ? `${activePreset.label} (${permissions.length})`
                      : `${permissions.length} of ${ALL_STAFF_PERMISSIONS.length} selected`
                    : "None selected"
                }
              />
              <PreviewRow label="Initial status" value="Active" />
            </div>
            <div className="mt-3.5 flex gap-2 rounded-md border border-[var(--semantic-blue-subtle)] bg-[var(--semantic-blue-subtle)] px-3 py-2.5">
              <Info className="mt-px h-[13px] w-[13px] shrink-0 text-[var(--semantic-blue)]" />
              <p className="text-[11.5px] leading-[1.5] text-[var(--text-2)]">
                They&apos;ll be required to change the temporary password on
                first login.
              </p>
            </div>
          </PreviewCard>
        </div>
      </form>
    </div>
  );
}
