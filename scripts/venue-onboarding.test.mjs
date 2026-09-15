import assert from "node:assert/strict";
import test from "node:test";

import {
  availablePaymentModes,
  validateManagerDraft,
  validateVenue,
} from "../src/lib/venue-onboarding-validation.ts";
import {
  CURRENCY_OPTIONS,
  currencyLabel,
  currencyOptionsFor,
} from "../src/lib/currencies.ts";

/** A venue that passes every rule; each test spoils exactly one field. */
function validVenue(overrides = {}) {
  return {
    managerId: "vm-1",
    nameEn: "Arena Sports Complex",
    nameAr: "مجمّع الأرينا الرياضي",
    addressLine: "Rue Verdun 12",
    city: "Saida",
    countryCode: "LB",
    latitude: 33.56,
    longitude: 35.37,
    timeZoneId: "Asia/Beirut",
    currencyCode: "USD",
    paymentMode: "CASH",
    autoConfirmation: false,
    allowRecurringBookings: false,
    courtLimit: 4,
    maxAdvanceBookingDays: 30,
    facilities: [],
    availability: { days: [] },
    ...overrides,
  };
}

function validManager(overrides = {}) {
  return {
    firstName: "Rami",
    lastName: "Haddad",
    email: "rami@athlits.com",
    phoneNumber: "71123456",
    phoneCountryCode: "LB",
    tempPassword: "Str0ng!Passw0rd",
    ...overrides,
  };
}

test("a complete venue draft reports no field errors", () => {
  assert.deepEqual(validateVenue(validVenue()), {});
});

test("each required venue field reports itself and nothing else", () => {
  const cases = [
    ["nameEn", { nameEn: "   " }],
    ["nameAr", { nameAr: "" }],
    ["addressLine", { addressLine: "" }],
    ["city", { city: "" }],
    ["timeZoneId", { timeZoneId: "" }],
    ["currencyCode", { currencyCode: "US" }],
  ];

  for (const [key, overrides] of cases) {
    const errors = validateVenue(validVenue(overrides));
    assert.deepEqual(
      Object.keys(errors),
      [key],
      `expected only ${key} to fail`,
    );
  }
});

test("court limit rejects missing, zero, and non-finite values", () => {
  for (const courtLimit of [undefined, 0, -3, Number.NaN]) {
    const errors = validateVenue(validVenue({ courtLimit }));
    assert.ok(
      errors.courtLimit,
      `courtLimit ${String(courtLimit)} should fail`,
    );
  }
  assert.equal(
    validateVenue(validVenue({ courtLimit: 1 })).courtLimit,
    undefined,
  );
});

test("advance booking days accepts the 1-365 range and rejects outside it", () => {
  for (const days of [1, 30, 365]) {
    assert.equal(
      validateVenue(validVenue({ maxAdvanceBookingDays: days }))
        .maxAdvanceBookingDays,
      undefined,
    );
  }
  for (const days of [0, 366, undefined]) {
    assert.ok(
      validateVenue(validVenue({ maxAdvanceBookingDays: days }))
        .maxAdvanceBookingDays,
      `${String(days)} days should fail`,
    );
  }
});

test("venue validation no longer requires contact details or a description", () => {
  // These three fields were removed from the form; the venue inherits the
  // manager's contact details at submit instead.
  const errors = validateVenue(validVenue());
  assert.equal(errors.contactEmail, undefined);
  assert.equal(errors.contactPhone, undefined);
  assert.equal(errors.description, undefined);
});

test("a complete manager draft reports no field errors", () => {
  assert.deepEqual(validateManagerDraft(validManager(), 4), {});
});

test("manager email distinguishes missing from malformed", () => {
  assert.equal(
    validateManagerDraft(validManager({ email: "" }), 4).email,
    "Enter a work email.",
  );
  assert.equal(
    validateManagerDraft(validManager({ email: "not-an-email" }), 4).email,
    "Enter a valid email address.",
  );
});

test("manager phone distinguishes missing from invalid-for-country", () => {
  assert.match(
    validateManagerDraft(validManager({ phoneNumber: "" }), 4).phoneNumber,
    /Enter a phone number/,
  );
  assert.match(
    validateManagerDraft(validManager({ phoneNumber: "12" }), 4).phoneNumber,
    /isn't valid for the selected country/,
  );
});

test("temp password fails on length first, then on strength", () => {
  assert.match(
    validateManagerDraft(validManager({ tempPassword: "short" }), 4)
      .tempPassword,
    /at least 10 characters/,
  );
  assert.match(
    validateManagerDraft(validManager({ tempPassword: "aaaaaaaaaaaa" }), 1)
      .tempPassword,
    /Too weak/,
  );
  assert.equal(
    validateManagerDraft(validManager({ tempPassword: "aaaaaaaaaaaa" }), 3)
      .tempPassword,
    undefined,
  );
});

test("online payment modes stay hidden until a payment link exists", () => {
  const MODES = [{ value: "CASH" }, { value: "ONLINE" }, { value: "BOTH" }];

  assert.deepEqual(
    availablePaymentModes(MODES, { whishPaymentLink: undefined }).map(
      (m) => m.value,
    ),
    ["CASH"],
  );
  assert.deepEqual(
    availablePaymentModes(MODES, { whishPaymentLink: "   " }).map(
      (m) => m.value,
    ),
    ["CASH"],
    "a whitespace-only link must not unlock online modes",
  );
  assert.deepEqual(
    availablePaymentModes(MODES, {
      whishPaymentLink: "https://whish.money/x",
    }).map((m) => m.value),
    ["CASH", "ONLINE", "BOTH"],
  );
});

test("new records are offered only USD and LBP", () => {
  assert.deepEqual(
    CURRENCY_OPTIONS.map((option) => option.code),
    ["USD", "LBP"],
  );
});

test("an existing record on a retired currency keeps it selectable", () => {
  // Without this, an EUR venue would render an empty select and silently
  // rewrite its currency on the next save.
  assert.deepEqual(
    currencyOptionsFor("EUR").map((option) => option.code),
    ["USD", "LBP", "EUR"],
  );
  assert.equal(currencyLabel("EUR"), "Euro");
});

test("currencyOptionsFor does not duplicate an already-offered code", () => {
  assert.deepEqual(
    currencyOptionsFor("usd").map((option) => option.code),
    ["USD", "LBP"],
  );
  assert.deepEqual(
    currencyOptionsFor("").map((option) => option.code),
    ["USD", "LBP"],
  );
});

test("currencyLabel falls back to the code for anything unrecognized", () => {
  assert.equal(currencyLabel("XYZ"), "XYZ");
  assert.equal(currencyLabel(null), "");
});
