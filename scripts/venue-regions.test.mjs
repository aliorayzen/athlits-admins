import assert from "node:assert/strict";
import test from "node:test";

import {
  groupVenuesByRegion,
  UNKNOWN_REGION,
  venueRegion,
} from "../src/lib/venue-regions.ts";

test("known localities resolve to their district", () => {
  assert.equal(venueRegion("Saida"), "Saida");
  // "Jezzîne" is a district value, not a locality name; the lookup is by
  // locality, so the test uses a town that sits in it.
  assert.equal(venueRegion("Ej Jarmaq"), "Jezzîne");
  assert.equal(venueRegion("Jounieh"), "Keserwan");
});

test("localities without a district fall back to the governorate", () => {
  // Beit ed Dine is in the Chouf, which the dataset does not name as a
  // district, so it reports under Mount Lebanon rather than disappearing.
  assert.equal(venueRegion("Beit ed Dine"), "Mount Lebanon");
});

test("blank and unrecognized localities land in the unassigned bucket", () => {
  for (const value of ["", "   ", null, undefined, "Atlantis"]) {
    assert.equal(venueRegion(value), UNKNOWN_REGION);
  }
});

test('the legacy "City: Name" fold is stripped before lookup', () => {
  assert.equal(venueRegion("City: Saida"), "Saida");
});

test("grouping totals every venue exactly once", () => {
  const venues = [
    { city: "Saida", status: "ACTIVE" },
    { city: "Saida", status: "SUSPENDED" },
    { city: "Beirut", status: "ACTIVE" },
    { city: "Atlantis", status: "ACTIVE" },
  ];
  const groups = groupVenuesByRegion(venues);

  assert.equal(
    groups.reduce((sum, g) => sum + g.total, 0),
    venues.length,
    "every venue must appear in exactly one region",
  );
  const saida = groups.find((g) => g.region === "Saida");
  assert.deepEqual(saida, {
    region: "Saida",
    total: 2,
    active: 1,
    suspended: 1,
  });
});

test("regions sort by size, then alphabetically, with unassigned last", () => {
  const groups = groupVenuesByRegion([
    { city: "Atlantis", status: "ACTIVE" },
    { city: "Atlantis", status: "ACTIVE" },
    { city: "Atlantis", status: "ACTIVE" },
    { city: "Beirut", status: "ACTIVE" },
    { city: "Saida", status: "ACTIVE" },
  ]);

  assert.deepEqual(
    groups.map((g) => g.region),
    ["Beirut", "Saida", UNKNOWN_REGION],
    "unassigned sorts last even though it has the most venues",
  );
});

test("a venue with no status counts as active", () => {
  // The venue list DTO can omit status; treating that as suspended would
  // under-report the active count on the overview KPI.
  const [group] = groupVenuesByRegion([{ city: "Beirut" }]);
  assert.equal(group.active, 1);
  assert.equal(group.suspended, 0);
});

test("grouping an empty list yields no regions", () => {
  assert.deepEqual(groupVenuesByRegion([]), []);
});
