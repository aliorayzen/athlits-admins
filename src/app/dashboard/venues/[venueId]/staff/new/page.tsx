"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CalendarCheck,
  Eye,
  Info,
  Mail,
  MapPin,
  User,
  Users,
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

const ACCENT = "amber" as const;
const FORM_ID = "create-venue-staff-form";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const PERMISSION_OPTIONS: Array<{
  value: StaffPermission;
  label: string;
  description: string;
  icon: typeof Eye;
}> = [
  {
    value: "BOOKINGS_READ",
    label: "View bookings",
    description: "See booking details, schedules, and customer information.",
    icon: Eye,
  },
  {
    value: "BOOKINGS_WRITE",
    label: "Manage bookings",
    description: "Create and update bookings for this venue.",
    icon: CalendarCheck,
  },
];

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
  const router = useRouter();
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
        router.push(`/dashboard/venues/${venue.id}`);
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
    [email, firstName, lastName, permissions, router, tempPassword, venue],
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

  const selectedPermissionLabels = PERMISSION_OPTIONS.filter((option) =>
    permissions.includes(option.value),
  ).map((option) => option.label);
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
          booking permissions you select below.
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
              desc="Select only the booking capabilities this staff member needs."
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

              <div
                className="grid gap-2 sm:grid-cols-2"
                aria-describedby={
                  fieldErrors.permissions ? "staff-permissions-error" : undefined
                }
              >
                {PERMISSION_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const checked = permissions.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border px-3.5 py-3 transition-colors ${
                        checked
                          ? "border-[rgba(245,158,11,0.3)] bg-[var(--semantic-amber-subtle)]"
                          : "border-[var(--border)] bg-[var(--bg-0)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-2)]"
                      }`}
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
                        <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--text-1)]">
                          <Icon className="h-3.5 w-3.5 text-[var(--semantic-amber)]" />
                          {option.label}
                        </span>
                        <span className="mt-1 block text-[11.5px] leading-[1.45] text-[var(--text-3)]">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
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
                  selectedPermissionLabels.length > 0
                    ? selectedPermissionLabels.join(", ")
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
