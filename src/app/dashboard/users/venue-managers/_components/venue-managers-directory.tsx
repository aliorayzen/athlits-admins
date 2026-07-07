"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Ban, Edit3, Loader2, Mail, Power, Save, User } from "lucide-react";
import { toast } from "sonner";

import { PhoneNumberField } from "@/components/phone-number-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DEFAULT_COUNTRY_CODE,
  countryCodeFromPhone,
  isValidPhoneForCountry,
  normalizePhoneForSubmit,
} from "@/lib/phone";
import {
  getApiErrorMessage,
  getApiErrorStatus,
  getApiFieldErrorMap,
} from "@/lib/api";
import type { UpdateVenueManagerRequest, UserDto } from "@/types/api";
import { cn } from "@/lib/utils";

import {
  DirectoryView,
  statusBucket,
} from "../../_components/directory/directory-view";
import { useVenueManagers } from "./use-venue-managers";

const CREATE_HREF = "/dashboard/users/create/venue-manager";
const INPUT_CLASS =
  "border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-1)] placeholder:text-[var(--text-4)] focus:border-[var(--semantic-amber)] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]";
const LABEL_CLASS =
  "text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-4)]";

type VmEditFieldErrors = Partial<
  Record<"firstName" | "lastName" | "email" | "phoneNumber", string>
>;

function venueManagerEditFieldErrors(err: unknown): VmEditFieldErrors {
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

export function VenueManagersDirectory() {
  const vm = useVenueManagers();

  return (
    <DirectoryView
      dir={vm}
      accent="amber"
      title="Venue Managers"
      subtitle="Managers scoped to their assigned venues"
      personLabel="Manager"
      idLabel="Manager ID"
      noun="venue managers"
      searchPlaceholder="Search name or email..."
      emptyTitle="No venue managers yet"
      emptyBody="Create a venue manager to give a venue operator scoped access"
      create={{ href: CREATE_HREF, label: "New venue manager" }}
      renderActions={(manager) => (
        <ManagerActions
          manager={manager}
          isPending={vm.pendingIds.has(manager.id)}
          onToggle={vm.toggleActive}
          onUpdate={vm.updateDetails}
        />
      )}
    />
  );
}

function ManagerActions({
  manager,
  isPending,
  onToggle,
  onUpdate,
}: {
  manager: UserDto;
  isPending: boolean;
  onToggle: (m: UserDto) => Promise<void>;
  onUpdate: (
    managerId: string,
    payload: UpdateVenueManagerRequest,
  ) => Promise<UserDto>;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <EditManagerDialog
        manager={manager}
        isPending={isPending}
        onUpdate={onUpdate}
      />
      <ManagerStatusAction
        manager={manager}
        isPending={isPending}
        onToggle={onToggle}
      />
    </div>
  );
}

function ManagerStatusAction({
  manager,
  isPending,
  onToggle,
}: {
  manager: UserDto;
  isPending: boolean;
  onToggle: (m: UserDto) => Promise<void>;
}) {
  const bucket = statusBucket(manager.status);

  if (bucket === "pending") {
    return (
      <span className="whitespace-nowrap font-mono text-[11px] text-[var(--text-4)]">
        Awaiting setup
      </span>
    );
  }

  const isActive = bucket === "active";
  const label = isActive ? "Deactivate" : "Activate";

  async function handleToggle() {
    const verb = isActive ? "Deactivated" : "Activated";
    try {
      await onToggle(manager);
      toast.success(`${verb} ${manager.firstName} ${manager.lastName}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-[5px] text-[12px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60",
        isActive
          ? "border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-3)] hover:border-[rgba(244,63,94,0.3)] hover:bg-[var(--semantic-red-subtle)] hover:text-[var(--semantic-red)]"
          : "border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.08)] text-[var(--semantic-green)] hover:bg-[rgba(16,185,129,0.14)]",
      )}
    >
      {isPending ? (
        <Loader2 className="h-[13px] w-[13px] animate-spin" />
      ) : isActive ? (
        <Ban className="h-[13px] w-[13px]" />
      ) : (
        <Power className="h-[13px] w-[13px]" />
      )}
      {label}
    </button>
  );
}

function EditManagerDialog({
  manager,
  isPending,
  onUpdate,
}: {
  manager: UserDto;
  isPending: boolean;
  onUpdate: (
    managerId: string,
    payload: UpdateVenueManagerRequest,
  ) => Promise<UserDto>;
}) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState(manager.firstName ?? "");
  const [lastName, setLastName] = useState(manager.lastName ?? "");
  const [email, setEmail] = useState(manager.email ?? "");
  const [phoneCountryCode, setPhoneCountryCode] = useState(
    countryCodeFromPhone(manager.phoneNumber ?? "") ?? DEFAULT_COUNTRY_CODE,
  );
  const [phoneNumber, setPhoneNumber] = useState(manager.phoneNumber ?? "");
  const [fieldErrors, setFieldErrors] = useState<VmEditFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFirstName(manager.firstName ?? "");
    setLastName(manager.lastName ?? "");
    setEmail(manager.email ?? "");
    setPhoneCountryCode(
      countryCodeFromPhone(manager.phoneNumber ?? "") ?? DEFAULT_COUNTRY_CODE,
    );
    setPhoneNumber(manager.phoneNumber ?? "");
    setFieldErrors({});
    setSubmitError(null);
  }, [manager, open]);

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    isValidPhoneForCountry(phoneNumber, phoneCountryCode) &&
    !isSubmitting &&
    !isPending;

  function clearFieldError(field: keyof VmEditFieldErrors) {
    setSubmitError(null);
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isSubmitting) return;
    setOpen(nextOpen);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});
    try {
      const updated = await onUpdate(manager.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneNumber:
          normalizePhoneForSubmit(phoneNumber, phoneCountryCode) ??
          phoneNumber.trim(),
      });
      toast.success(`Updated ${updated.firstName} ${updated.lastName}`);
      setOpen(false);
    } catch (err: unknown) {
      const message = getApiErrorMessage(
        err,
        "Couldn't update this venue manager. Please try again.",
      );
      setFieldErrors(venueManagerEditFieldErrors(err));
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={(props) => (
          <button
            {...props}
            type="button"
            disabled={isPending}
            title="Edit venue manager"
            aria-label={`Edit ${manager.firstName} ${manager.lastName}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] px-2.5 py-[5px] text-[12px] font-medium text-[var(--semantic-amber)] transition-all hover:bg-[rgba(245,158,11,0.14)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-[13px] w-[13px] animate-spin" />
            ) : (
              <Edit3 className="h-[13px] w-[13px]" />
            )}
            Edit
          </button>
        )}
      />
      <DialogContent className="border-[var(--border)] bg-[var(--bg-1)] sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pr-7">
            <DialogTitle className="text-[16px] text-[var(--text-1)]">
              Edit venue manager
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-[var(--text-3)]">
              Update the manager&apos;s account and contact details.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <EditTextField
              label="First name"
              required
              icon={User}
              value={firstName}
              onChange={(value) => {
                clearFieldError("firstName");
                setFirstName(value);
              }}
              placeholder="Jane"
              error={fieldErrors.firstName}
            />
            <EditTextField
              label="Last name"
              required
              icon={User}
              value={lastName}
              onChange={(value) => {
                clearFieldError("lastName");
                setLastName(value);
              }}
              placeholder="Smith"
              error={fieldErrors.lastName}
            />
            <EditTextField
              label="Email"
              required
              icon={Mail}
              type="email"
              value={email}
              onChange={(value) => {
                clearFieldError("email");
                setEmail(value);
              }}
              placeholder="manager@venue.com"
              error={fieldErrors.email}
              className="sm:col-span-2"
            />
            <div className="space-y-1.5 sm:col-span-2">
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

          {submitError && (
            <div
              role="alert"
              className="mt-4 rounded-md border border-[rgba(244,63,94,0.18)] bg-[rgba(244,63,94,0.08)] px-3 py-2 text-[12.5px] leading-5 text-[var(--semantic-red)]"
            >
              {submitError}
            </div>
          )}

          <DialogFooter className="mt-5 border-[var(--border)] bg-white/[0.008]">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setOpen(false)}
              className="border-[var(--border)] bg-[var(--bg-2)] text-[var(--text-2)]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="gap-1.5 border border-[rgba(245,158,11,0.3)] bg-[linear-gradient(135deg,#f59e0b_0%,#d97706_100%)] px-4 text-[13px] font-semibold text-[#1a1100] shadow-[0_0_20px_-6px_rgba(245,158,11,0.35)] transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditTextField({
  label,
  required,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  className,
}: {
  label: string;
  required?: boolean;
  icon: typeof User;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className={LABEL_CLASS}>
        {label}
        {required && (
          <span className="ml-1.5 text-[var(--semantic-red)] opacity-85">
            *
          </span>
        )}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-[11px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[var(--text-4)]" />
        <input
          type={type}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-invalid={Boolean(error) || undefined}
          className={cn(
            "h-[38px] w-full rounded-md border bg-[var(--bg-0)] pl-[34px] pr-3 text-[13.5px] text-[var(--text-1)] outline-none transition-all placeholder:text-[var(--text-4)]",
            error
              ? "border-[var(--semantic-red)] shadow-[0_0_0_3px_rgba(244,63,94,0.12)] focus:border-[var(--semantic-red)]"
              : "border-[var(--border)] focus:border-[var(--semantic-amber)] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.12)]",
          )}
        />
      </div>
      {error && (
        <p
          role="alert"
          className="text-[11px] leading-[1.4] text-[var(--semantic-red)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
