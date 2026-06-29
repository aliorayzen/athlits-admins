"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Mail, Shield, User } from "lucide-react";
import { toast } from "sonner";

import {
  createAdmin,
  getApiErrorMessage,
  getApiErrorStatus,
  getApiFieldErrors,
} from "@/lib/api";
import { BackLink } from "../_components/back-link";
import {
  FormFooter,
  FormSection,
  PreviewCard,
  PreviewRow,
  TextField,
} from "../_components/form-primitives";
import { useSubmitShortcut } from "../_components/use-submit-shortcut";

const ACCENT = "teal" as const;
const FORM_ID = "create-admin-form";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELD_NAMES = ["firstName", "lastName", "email"] as const;

type FieldName = (typeof FIELD_NAMES)[number];
type FieldErrors = Partial<Record<FieldName, string>>;

function isFieldName(field: string): field is FieldName {
  return FIELD_NAMES.includes(field as FieldName);
}

function validateFields(values: {
  firstName: string;
  lastName: string;
  email: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.firstName.trim()) errors.firstName = "First name is required.";
  if (!values.lastName.trim()) errors.lastName = "Last name is required.";

  const email = values.email.trim();
  if (!email) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  return errors;
}

export default function CreateAdminPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlight = useRef(false);

  useSubmitShortcut(FORM_ID);

  const canSubmit = !isSubmitting;

  const clearFieldError = useCallback((field: FieldName) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (inFlight.current) return;

      const nextFieldErrors = validateFields({ firstName, lastName, email });
      setFieldErrors(nextFieldErrors);
      if (Object.keys(nextFieldErrors).length > 0) {
        toast.error("Check the highlighted fields and try again.");
        return;
      }

      inFlight.current = true;
      setIsSubmitting(true);
      try {
        const created = await createAdmin({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });
        const adminName =
          `${created.user.firstName} ${created.user.lastName}`.trim() ||
          created.user.email;
        toast.success(created.message, {
          description: `${adminName} - ${created.user.email}`,
        });
        router.push("/dashboard/users/admins");
      } catch (err: unknown) {
        const status = getApiErrorStatus(err);
        const message =
          status === 409
            ? "Email already in use"
            : getApiErrorMessage(err, "Failed to create admin");
        const mappedErrors = getApiFieldErrors(err).reduce<FieldErrors>(
          (acc, fieldError) => {
            if (isFieldName(fieldError.field)) {
              acc[fieldError.field] = fieldError.message;
            }
            return acc;
          },
          {},
        );

        if (status === 409) {
          mappedErrors.email = message;
        }

        if (Object.keys(mappedErrors).length > 0) {
          setFieldErrors(mappedErrors);
          toast.error(
            status === 409
              ? message
              : "Check the highlighted fields and try again.",
          );
        } else {
          toast.error(message);
        }
      } finally {
        inFlight.current = false;
        setIsSubmitting(false);
      }
    },
    [email, firstName, lastName, router],
  );

  const preview = {
    initials: `${firstName[0] ?? "J"}${lastName[0] ?? "D"}`.toUpperCase(),
    name: `${firstName.trim() || "First"} ${lastName.trim() || "Last"}`.trim(),
    email: email.trim() || "admin@orayzen.com",
  };

  return (
    <div className="users-create-v2 space-y-0">
      <BackLink href="/dashboard/users/create" label="Choose role" />

      <div className="mb-7">
        <h1 className="mb-1.5 text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--text-1)]">
          Create an admin
        </h1>
        <p className="text-[13.5px] tracking-[-0.003em] text-[var(--text-3)]">
          Admins have platform-wide access. They log in with a one-time code
          emailed to them - no password to set.
        </p>
      </div>

      <form id={FORM_ID} onSubmit={handleSubmit} noValidate>
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
                    setFirstName(value);
                    clearFieldError("firstName");
                  }}
                  placeholder="John"
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
                  placeholder="Doe"
                  error={fieldErrors.lastName}
                />
              </div>
            </FormSection>

            <FormSection
              step={2}
              accent={ACCENT}
              label="Contact"
              title="How do we reach them?"
              desc="Email is how they receive their one-time login code."
            >
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
                placeholder="admin@orayzen.com"
                error={fieldErrors.email}
                hint={{
                  tone: "info",
                  icon: Info,
                  text: "Admin will receive a one-time OTP via email on first login.",
                }}
              />
            </FormSection>

            <FormFooter
              accent={ACCENT}
              submitting={isSubmitting}
              canSubmit={canSubmit}
              submitLabel="Create Admin"
              submitIcon={Shield}
              cancelHref="/dashboard/users"
            />
          </div>

          <PreviewCard
            accent={ACCENT}
            initials={preview.initials}
            name={preview.name}
            email={preview.email}
            badgeLabel="Admin"
            badgeIcon={Shield}
          >
            <div className="flex flex-col gap-2">
              <PreviewRow label="Access scope" value="All venues" />
              <PreviewRow label="Login method" value="OTP via email" />
              <PreviewRow
                label="Initial status"
                value="Pending - first login"
              />
            </div>
            <div className="mt-3.5 flex gap-2 rounded-md border border-[rgba(99,102,241,0.14)] bg-[rgba(99,102,241,0.08)] px-3 py-2.5">
              <Info className="mt-px h-[13px] w-[13px] flex-shrink-0 text-[var(--semantic-blue)]" />
              <div className="text-[11.5px] leading-[1.5] text-[var(--text-2)]">
                They&apos;ll appear in the directory with{" "}
                <strong>Pending</strong> status until first login.
              </div>
            </div>
          </PreviewCard>
        </div>
      </form>
    </div>
  );
}
