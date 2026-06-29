// Currency options offered when creating a venue. Kept as a small, explicit
// allowlist so operators pick from a known set instead of free-typing a code.
// USD is the platform default.

export interface CurrencyOption {
  code: string;
  label: string;
}

export const DEFAULT_CURRENCY = "USD";

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "SAR", label: "Saudi Riyal" },
  { code: "AED", label: "UAE Dirham" },
  { code: "QAR", label: "Qatari Riyal" },
  { code: "KWD", label: "Kuwaiti Dinar" },
  { code: "BHD", label: "Bahraini Dinar" },
  { code: "OMR", label: "Omani Rial" },
  { code: "JOD", label: "Jordanian Dinar" },
  { code: "EGP", label: "Egyptian Pound" },
  { code: "LBP", label: "Lebanese Pound" },
];
