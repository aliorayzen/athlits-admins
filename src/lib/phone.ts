import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

export const DEFAULT_COUNTRY_CODE: CountryCode = "LB";

const SUPPORTED_COUNTRIES = new Set<CountryCode>(getCountries());

export function isSupportedCountryCode(value: string): value is CountryCode {
  return SUPPORTED_COUNTRIES.has(value.trim().toUpperCase() as CountryCode);
}

export function normalizeCountryCode(value: string): CountryCode {
  const normalized = value.trim().toUpperCase();
  return isSupportedCountryCode(normalized) ? normalized : DEFAULT_COUNTRY_CODE;
}

export function getCallingCodePrefix(countryCode: string): string {
  return `+${getCountryCallingCode(normalizeCountryCode(countryCode))}`;
}

export function formatInternationalPhone(value: string): string {
  if (!value.trim()) return "";
  return new AsYouType().input(value);
}

export function formatPhoneForCountry(
  value: string,
  countryCode: string,
): string {
  if (!value.trim()) return "";
  if (value.trim().startsWith("+")) return formatInternationalPhone(value);
  return new AsYouType(normalizeCountryCode(countryCode)).input(value);
}

export function nationalPhoneInputValue(
  value: string | undefined,
  countryCode: string,
): string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === getCallingCodePrefix(countryCode)) return "";
  if (!trimmed.startsWith("+")) {
    return formatPhoneForCountry(trimmed, countryCode);
  }

  const parsed = parsePhoneNumberFromString(
    trimmed,
    normalizeCountryCode(countryCode),
  );

  if (parsed?.nationalNumber) {
    return parsed.formatNational();
  }

  return formatPhoneForCountry(trimmed, countryCode);
}

export function phoneValueForCountry(
  value: string | undefined,
  countryCode: string,
): string {
  const prefix = getCallingCodePrefix(countryCode);
  const trimmed = value?.trim();
  if (!trimmed) return prefix;

  const parsed = parsePhoneNumberFromString(trimmed);
  const nationalDigits = parsed?.nationalNumber ?? trimmed.replace(/\D/g, "");
  const withoutLeadingZeros = nationalDigits.replace(/^0+/, "");
  const nextValue = withoutLeadingZeros
    ? `${prefix}${withoutLeadingZeros}`
    : prefix;

  return formatInternationalPhone(nextValue);
}

export function countryCodeFromPhone(value: string): CountryCode | null {
  if (!value.trim().startsWith("+")) return null;
  const asYouType = new AsYouType();
  asYouType.input(value);
  const country = asYouType.getCountry();
  return country && isSupportedCountryCode(country) ? country : null;
}

function hasNationalDigits(value: string, countryCode: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (!value.trim().startsWith("+")) return digits.length > 0;

  const prefixDigits = getCallingCodePrefix(countryCode).replace(/\D/g, "");
  return digits.length > prefixDigits.length;
}

export function normalizePhoneForSubmit(
  value: string | undefined,
  countryCode: string,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (!hasNationalDigits(trimmed, countryCode)) return undefined;

  const phoneNumber = parsePhoneNumberFromString(
    trimmed,
    normalizeCountryCode(countryCode),
  );

  if (phoneNumber?.isValid()) return phoneNumber.number;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return undefined;

  if (trimmed.startsWith("+")) return `+${digits}`;

  return `${getCallingCodePrefix(countryCode)}${digits.replace(/^0+/, "")}`;
}

export function isValidPhoneForCountry(
  value: string,
  countryCode: string,
): boolean {
  if (!hasNationalDigits(value, countryCode)) return false;

  const phoneNumber = parsePhoneNumberFromString(
    value.trim(),
    normalizeCountryCode(countryCode),
  );

  return Boolean(phoneNumber?.isValid());
}
