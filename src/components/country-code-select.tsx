"use client";

import { useMemo } from "react";
import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js";

import { normalizeCountryCode } from "@/lib/phone";
import { cn } from "@/lib/utils";

interface CountryCodeSelectProps {
  id?: string;
  value: string;
  onChange: (value: CountryCode) => void;
  className?: string;
  compact?: boolean;
  required?: boolean;
}

const COUNTRIES = getCountries();

function countryLabel(
  code: CountryCode,
  names: Intl.DisplayNames | null,
): string {
  return names?.of(code) ?? code;
}

export function CountryCodeSelect({
  id,
  value,
  onChange,
  className,
  compact,
  required,
}: CountryCodeSelectProps) {
  const countryNames = useMemo(() => {
    if (typeof Intl === "undefined" || !("DisplayNames" in Intl)) return null;
    return new Intl.DisplayNames(["en"], { type: "region" });
  }, []);

  const selectedValue = normalizeCountryCode(value);

  return (
    <select
      id={id}
      required={required}
      value={selectedValue}
      onChange={(event) => onChange(normalizeCountryCode(event.target.value))}
      className={cn(
        "h-9 w-full rounded-md border px-3 text-sm outline-none transition-all disabled:opacity-50",
        className,
      )}
    >
      {COUNTRIES.map((code) => (
        <option key={code} value={code}>
          {compact
            ? `${code} +${getCountryCallingCode(code)}`
            : `${code} +${getCountryCallingCode(code)} · ${countryLabel(
                code,
                countryNames,
              )}`}
        </option>
      ))}
    </select>
  );
}
