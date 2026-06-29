"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Table as TableIcon, User } from "lucide-react";
import { toast } from "sonner";

import { PhoneNumberField } from "@/components/phone-number-field";
import {
  createVenueManager,
  getApiErrorMessage,
  getApiErrorStatus,
  getApiFieldErrorMap,
} from "@/lib/api";
import {
  DEFAULT_COUNTRY_CODE,
  isValidPhoneForCountry,
  normalizePhoneForSubmit,
} from "@/lib/phone";
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

export default function CreateVenueManagerPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] =
    useState(DEFAULT_COUNTRY_CODE);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<VmCreateFieldErrors>({});
  // Synchronous in-flight guard: closes the double-submit window that ⌘/Ctrl+
  // Enter (form.requestSubmit) can open faster than an isSubmitting re-render.
  const inFlight = useRef(false);

  useSubmitShortcut(FORM_ID);

  // Seed a strong starter password on first render so the field is never empty.
  useEffect(() => {
    setTempPassword((current) => current || generatePassword());
  }, []);

  const strength = useMemo(
    () => passwordStrength(tempPassword),
    [tempPassword],
  );

  const canSubmit = useMemo(() => {
    const basics = firstName.trim() && lastName.trim() && email.trim();
    return Boolean(
      basics &&
      isValidPhoneForCountry(phoneNumber, phoneCountryCode) &&
      tempPassword.length >= MIN_PASSWORD_LENGTH &&
      strength >= MIN_PASSWORD_STRENGTH,
    );
  }, [
    firstName,
    lastName,
    email,
    phoneNumber,
    phoneCountryCode,
    tempPassword,
    strength,
  ]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit || inFlight.current) return;
      inFlight.current = true;
      setIsSubmitting(true);
      setFieldErrors({});
      try {
        await createVenueManager({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber:
            normalizePhoneForSubmit(phoneNumber, phoneCountryCode) ??
            phoneNumber.trim(),
          tempPassword,
        });
        toast.success(
          `Venue Manager ${firstName.trim()} ${lastName.trim()} created`,
        );
        router.push("/dashboard/users/venue-managers");
      } catch (err: unknown) {
        setFieldErrors(venueManagerFieldErrors(err));
        toast.error(getApiErrorMessage(err, "Failed to create venue manager"));
      } finally {
        inFlight.current = false;
        setIsSubmitting(false);
      }
    },
    [
      canSubmit,
      email,
      firstName,
      lastName,
      phoneNumber,
      phoneCountryCode,
      tempPassword,
      router,
    ],
  );

  const clearFieldError = useCallback((field: keyof VmCreateFieldErrors) => {
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
    phone: phoneNumber.trim() || "+961",
  };

  return (
    <div className="users-create-v2 space-y-0">
      <BackLink href="/dashboard/users/create" label="Choose role" />

      <div className="mb-7">
        <h1 className="mb-1.5 text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-1)]">
          Create a venue manager
        </h1>
        <p className="text-[13.5px] tracking-[-0.003em] text-[var(--text-3)]">
          Venue Managers are scoped to assigned venues. They log in with their
          email and a temporary password you set — rotated on first login.
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
              desc="Email is how they receive credentials. Phone is required for Venue Managers."
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
                    inputClassName="border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-1)]"
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
              desc="Venue Managers log in with email + temp password. They'll be prompted to change it on first login."
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

            <FormFooter
              accent={ACCENT}
              submitting={isSubmitting}
              canSubmit={canSubmit}
              submitLabel="Create Venue Manager"
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
              <PreviewRow label="Access scope" value="Assigned venues only" />
              <PreviewRow label="Login method" value="Email + temp password" />
              <PreviewRow label="Phone" value={preview.phone} mono />
              <PreviewRow
                label="Initial status"
                value="Active after creation"
              />
            </div>
            <div className="mt-3.5 flex gap-2 rounded-md border border-[rgba(245,158,11,0.14)] bg-[rgba(245,158,11,0.08)] px-3 py-2.5">
              <div className="text-[11.5px] leading-[1.5] text-[var(--text-2)]">
                After creating, share the temporary password via a secure
                channel — it <strong>won&apos;t be shown</strong> again.
              </div>
            </div>
          </PreviewCard>
        </div>
      </form>
    </div>
  );
}
