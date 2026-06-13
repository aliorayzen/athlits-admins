"use client";

import type { CountryCode } from "libphonenumber-js";

import { CountryCodeSelect } from "@/components/country-code-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  countryCodeFromPhone,
  formatPhoneForCountry,
  formatInternationalPhone,
  nationalPhoneInputValue,
} from "@/lib/phone";
import { cn } from "@/lib/utils";

interface PhoneNumberFieldProps {
  countryCode: string;
  phoneNumber: string;
  onCountryCodeChange: (value: CountryCode) => void;
  onPhoneNumberChange: (value: string) => void;
  phoneLabel?: string;
  required?: boolean;
  inputClassName?: string;
  labelClassName?: string;
  className?: string;
}

export function PhoneNumberField({
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
  phoneLabel = "Phone number",
  required,
  inputClassName,
  labelClassName,
  className,
}: PhoneNumberFieldProps) {
  function handleCountryChange(nextCountryCode: CountryCode) {
    const nationalValue = nationalPhoneInputValue(phoneNumber, countryCode);

    onCountryCodeChange(nextCountryCode);
    onPhoneNumberChange(formatPhoneForCountry(nationalValue, nextCountryCode));
  }

  function handlePhoneChange(value: string) {
    if (!value.trim()) {
      onPhoneNumberChange("");
      return;
    }

    const formatted = value.trim().startsWith("+")
      ? formatInternationalPhone(value)
      : formatPhoneForCountry(value, countryCode);
    const detectedCountry = value.trim().startsWith("+")
      ? countryCodeFromPhone(formatted)
      : null;

    if (detectedCountry && detectedCountry !== countryCode) {
      onCountryCodeChange(detectedCountry);
    }

    onPhoneNumberChange(
      value.trim().startsWith("+")
        ? nationalPhoneInputValue(formatted, detectedCountry ?? countryCode)
        : formatted,
    );
  }

  const inputValue = nationalPhoneInputValue(phoneNumber, countryCode);

  return (
    <div className={cn("space-y-2", className)}>
      <Label className={labelClassName}>
        {phoneLabel}
        {required && <span className="ml-1 text-[var(--semantic-red)]">*</span>}
      </Label>
      <div
        className={cn(
          "grid h-9 grid-cols-[minmax(112px,0.34fr)_1fr] overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-1)] transition-all focus-within:border-[var(--teal)] focus-within:ring-[3px] focus-within:ring-[var(--teal-subtle)]",
          inputClassName,
        )}
      >
        <CountryCodeSelect
          value={countryCode}
          onChange={handleCountryChange}
          required={required}
          compact
          className="h-full rounded-none border-0 border-r border-[var(--border)] bg-transparent px-2 text-[12px] font-semibold text-[var(--text-2)] outline-none hover:bg-[var(--bg-2)] focus:bg-[var(--bg-2)]"
        />
        <Input
          type="tel"
          value={inputValue}
          onChange={(event) => handlePhoneChange(event.target.value)}
          placeholder="Local number"
          className="h-full rounded-none border-0 bg-transparent px-3 text-sm text-[var(--text-1)] shadow-none outline-none focus-visible:border-transparent focus-visible:ring-0"
        />
      </div>
    </div>
  );
}
