"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface VenueBookingPreferencesFieldProps {
  autoConfirmation: boolean;
  onAutoConfirmationChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function VenueBookingPreferencesField({
  autoConfirmation,
  onAutoConfirmationChange,
  disabled = false,
}: VenueBookingPreferencesFieldProps) {
  const switchId = useId();
  const descriptionId = `${switchId}-description`;

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] p-4">
      <div className="min-w-0">
        <Label
          htmlFor={switchId}
          className="text-sm font-medium text-[var(--text-1)]"
        >
          Auto-confirm bookings
        </Label>
        <p id={descriptionId} className="mt-1 text-xs text-[var(--text-4)]">
          Confirm new bookings immediately instead of reviewing each request.
        </p>
      </div>
      <Switch
        id={switchId}
        checked={autoConfirmation}
        onCheckedChange={onAutoConfirmationChange}
        disabled={disabled}
        aria-describedby={descriptionId}
      />
    </div>
  );
}
