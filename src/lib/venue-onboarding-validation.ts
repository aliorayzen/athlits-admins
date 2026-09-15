// Validation for the venue-manager onboarding flow.
//
// These live outside the page component so they can be unit tested and so the
// "is this step valid?" question and the "what exactly is wrong?" question are
// answered by the same code. Both steps' submit buttons stay enabled; clicking
// one is how the operator asks what is missing, and these maps are the answer.

import type { CreateVenueRequest, PaymentMode } from "../types/api.ts";
import { isValidPhoneForCountry } from "./phone.ts";

/** Venue fields the operator can get wrong. Keys match the form controls. */
export type VenueFieldKey =
  | "nameEn"
  | "nameAr"
  | "addressLine"
  | "city"
  | "timeZoneId"
  | "currencyCode"
  | "courtLimit"
  | "maxAdvanceBookingDays"
  | "availability";

export type VenueFieldErrors = Partial<Record<VenueFieldKey, string>>;

export type ManagerFieldKey =
  "firstName" | "lastName" | "email" | "phoneNumber" | "tempPassword";

export type ManagerFieldErrors = Partial<Record<ManagerFieldKey, string>>;

export interface ManagerDraft {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  phoneCountryCode: string;
  tempPassword: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_TEMP_PASSWORD_LENGTH = 10;
export const MIN_PASSWORD_SCORE = 3;
export const MAX_ADVANCE_BOOKING_DAYS = 365;

/**
 * An empty map means the venue step is valid.
 *
 * `availabilityHasErrors` is supplied by the caller rather than computed here:
 * the check lives with the availability editor component, and this module stays
 * free of UI-layer imports so it can be unit tested in isolation.
 */
export function validateVenue(
  venue: CreateVenueRequest,
  availabilityHasErrors = false,
): VenueFieldErrors {
  const errors: VenueFieldErrors = {};

  if (!venue.nameEn.trim()) errors.nameEn = "Enter the venue's English name.";
  if (!venue.nameAr.trim()) errors.nameAr = "Enter the venue's Arabic name.";
  if (!venue.addressLine.trim()) {
    errors.addressLine = "Enter the venue's street address.";
  }
  if (!venue.city.trim()) errors.city = "Pick the venue's locality.";
  if (!venue.timeZoneId) {
    errors.timeZoneId = "Pick the time zone the venue operates in.";
  }
  if (venue.currencyCode.trim().length !== 3) {
    errors.currencyCode = "Pick a currency.";
  }

  const courtLimit = venue.courtLimit;
  if (
    courtLimit === undefined ||
    !Number.isFinite(courtLimit) ||
    courtLimit < 1
  ) {
    errors.courtLimit =
      "Enter how many courts this venue may host (1 or more).";
  }

  const advanceDays = venue.maxAdvanceBookingDays;
  if (
    advanceDays === undefined ||
    advanceDays < 1 ||
    advanceDays > MAX_ADVANCE_BOOKING_DAYS
  ) {
    errors.maxAdvanceBookingDays = `Enter a value between 1 and ${MAX_ADVANCE_BOOKING_DAYS} days.`;
  }

  if (availabilityHasErrors) {
    errors.availability =
      "Fix the highlighted operating hours — each open day needs a closing time after its opening time.";
  }

  return errors;
}

/**
 * Client-side counterpart to the server's field errors. Runs on submit so an
 * incomplete draft explains itself without a round trip.
 */
export function validateManagerDraft(
  draft: ManagerDraft,
  passwordScore: number,
): ManagerFieldErrors {
  const errors: ManagerFieldErrors = {};

  if (!draft.firstName.trim()) errors.firstName = "Enter a first name.";
  if (!draft.lastName.trim()) errors.lastName = "Enter a last name.";

  const email = draft.email.trim();
  if (!email) errors.email = "Enter a work email.";
  else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!isValidPhoneForCountry(draft.phoneNumber, draft.phoneCountryCode)) {
    errors.phoneNumber = draft.phoneNumber.trim()
      ? "That phone number isn't valid for the selected country."
      : "Enter a phone number.";
  }

  if (draft.tempPassword.length < MIN_TEMP_PASSWORD_LENGTH) {
    errors.tempPassword = `Use at least ${MIN_TEMP_PASSWORD_LENGTH} characters.`;
  } else if (passwordScore < MIN_PASSWORD_SCORE) {
    errors.tempPassword =
      "Too weak. Mix upper and lower case, numbers, and a symbol.";
  }

  return errors;
}

/**
 * Which payment modes a venue can actually be set to.
 *
 * Taking money online requires a Whish payment link — `venues/new` enforces the
 * same rule by clearing the link whenever the mode drops to CASH. The
 * onboarding flow does not collect a link, so offering "Online only" and
 * "Cash & online" there would let an operator pick a mode the venue cannot
 * honour. They stay hidden until a link exists.
 */
export function availablePaymentModes<T extends { value: PaymentMode }>(
  modes: readonly T[],
  venue: Pick<CreateVenueRequest, "whishPaymentLink">,
): T[] {
  const hasPaymentLink = Boolean(venue.whishPaymentLink?.trim());
  return modes.filter((mode) => mode.value === "CASH" || hasPaymentLink);
}
