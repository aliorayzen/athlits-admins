// Currency handling has two separate jobs, and conflating them loses data.
//
//   1. What we OFFER when creating something new — deliberately narrow.
//   2. What we can DISPLAY for a record that already exists — must stay wide,
//      because venues created before the list was narrowed still carry those
//      codes, and an edit form that can't render a venue's currency will
//      silently rewrite it on the next save.
//
// `CURRENCY_OPTIONS` is (1). `currencyOptionsFor()` is (2): it returns the
// offered list plus the record's own code when that code sits outside it.

export interface CurrencyOption {
  code: string;
  label: string;
}

export const DEFAULT_CURRENCY = "USD";

/** Offered for new venues and contracts. Narrowed to the two live markets. */
export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "USD", label: "US Dollar" },
  { code: "LBP", label: "Lebanese Pound" },
];

/**
 * Every code the platform has ever written to a venue. Used for lookup and to
 * keep existing records editable; never offered wholesale in a new-record form.
 */
const KNOWN_CURRENCIES: CurrencyOption[] = [
  ...CURRENCY_OPTIONS,
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
];

function normalizeCode(code: string | null | undefined): string {
  return (code ?? "").trim().toUpperCase();
}

/** Human label for a code, falling back to the code itself when unrecognized. */
export function currencyLabel(code: string | null | undefined): string {
  const normalized = normalizeCode(code);
  return (
    KNOWN_CURRENCIES.find((option) => option.code === normalized)?.label ??
    normalized
  );
}

/**
 * Options to render in a select that is editing an existing record. Returns the
 * offered list, plus `currentCode` appended when it falls outside that list, so
 * a venue on a retired currency keeps showing its real value instead of an
 * empty "Select currency" placeholder.
 */
export function currencyOptionsFor(
  currentCode: string | null | undefined,
): CurrencyOption[] {
  const normalized = normalizeCode(currentCode);
  if (!normalized) return CURRENCY_OPTIONS;
  if (CURRENCY_OPTIONS.some((option) => option.code === normalized)) {
    return CURRENCY_OPTIONS;
  }
  return [
    ...CURRENCY_OPTIONS,
    { code: normalized, label: currencyLabel(normalized) },
  ];
}
