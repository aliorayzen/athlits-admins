"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Mail, Shield, User } from "lucide-react";
import { toast } from "sonner";

import { createAdmin, getApiErrorMessage } from "@/lib/api";
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

export default function CreateAdminPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Synchronous in-flight guard: closes the double-submit window that ⌘/Ctrl+
  // Enter (form.requestSubmit) can open faster than an isSubmitting re-render.
  const inFlight = useRef(false);

  useSubmitShortcut(FORM_ID);

  const canSubmit = useMemo(
    () => Boolean(firstName.trim() && lastName.trim() && email.trim()),
    [firstName, lastName, email],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit || inFlight.current) return;
      inFlight.current = true;
      setIsSubmitting(true);
      try {
        await createAdmin({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });
        toast.success(
          `Admin ${firstName.trim()} ${lastName.trim()} created — OTP sent`,
        );
        router.push("/dashboard/users/admins");
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, "Failed to create admin"));
      } finally {
        inFlight.current = false;
        setIsSubmitting(false);
      }
    },
    [canSubmit, email, firstName, lastName, router],
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
          emailed to them — no password to set.
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
                  onChange={setFirstName}
                  placeholder="John"
                />
                <TextField
                  label="Last name"
                  required
                  icon={User}
                  accent={ACCENT}
                  value={lastName}
                  onChange={setLastName}
                  placeholder="Doe"
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
                onChange={setEmail}
                placeholder="admin@orayzen.com"
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
                value="Pending · first login"
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
