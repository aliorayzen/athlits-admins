import assert from "node:assert/strict";
import test from "node:test";

import { adminEndpoints } from "../src/lib/admin-endpoints.ts";

test("store import uses POST and encodes the platform segment", () => {
  assert.deepEqual(adminEndpoints.runStoreImport("APPLE/beta"), {
    method: "POST",
    path: "/api/admin/v1/store-analytics/imports/APPLE%2Fbeta/run",
  });
});

test("staff removal uses DELETE and encodes both user segments", () => {
  assert.deepEqual(adminEndpoints.removeVenueManagerStaff("manager/1", "staff 2"), {
    method: "DELETE",
    path: "/api/admin/v1/users/venue-managers/manager%2F1/staff/staff%202",
  });
});

test("contract update uses PUT and targets the selected contract", () => {
  assert.deepEqual(adminEndpoints.updateVenueContract("venue/1", "contract 2"), {
    method: "PUT",
    path: "/api/admin/v1/venues/venue%2F1/contracts/contract%202",
  });
});

test("court deletion uses DELETE and encodes venue and court IDs", () => {
  assert.deepEqual(adminEndpoints.deleteCourt("venue/1", "court 2"), {
    method: "DELETE",
    path: "/api/admin/v1/venues/venue%2F1/courts/court%202",
  });
});

test("user blocking is an explicit PUT without toggle semantics", () => {
  assert.deepEqual(adminEndpoints.blockUser("user/1"), {
    method: "PUT",
    path: "/api/admin/v1/users/user%2F1/block",
  });
});

test("venue scheduling endpoints keep check and confirm distinct", () => {
  assert.deepEqual(adminEndpoints.venueAvailability("venue/1"), {
    method: "GET",
    path: "/api/admin/v1/venues/venue%2F1/availability",
  });
  assert.deepEqual(adminEndpoints.checkVenueBlackout("venue/1"), {
    method: "POST",
    path: "/api/admin/v1/venues/venue%2F1/blackout-dates/check",
  });
  assert.deepEqual(adminEndpoints.confirmVenueBlackout("venue/1"), {
    method: "POST",
    path: "/api/admin/v1/venues/venue%2F1/blackout-dates/confirm",
  });
  assert.deepEqual(adminEndpoints.deleteVenueBlackout("venue/1", "blackout 2"), {
    method: "DELETE",
    path: "/api/admin/v1/venues/venue%2F1/blackout-dates/blackout%202",
  });
});

test("court scheduling uses dedicated availability and conflict routes", () => {
  assert.deepEqual(adminEndpoints.updateCourtLimit("venue/1"), {
    method: "PUT",
    path: "/api/admin/v1/venues/venue%2F1/court-limit",
  });
  assert.deepEqual(adminEndpoints.courtAvailability("venue/1", "court 2"), {
    method: "GET",
    path: "/api/admin/v1/venues/venue%2F1/courts/court%202/availability",
  });
  assert.deepEqual(adminEndpoints.updateCourtAvailability("venue/1", "court 2"), {
    method: "PUT",
    path: "/api/admin/v1/venues/venue%2F1/courts/court%202/availability",
  });
  assert.deepEqual(adminEndpoints.courtConflicts("venue/1", "court 2"), {
    method: "GET",
    path: "/api/admin/v1/venues/venue%2F1/courts/court%202/conflicts",
  });
});

test("granular court configuration routes encode every dynamic segment", () => {
  const venue = "venue/1";
  const court = "court 2";
  const sport = "sport/3";
  const encodedBase = "/api/admin/v1/venues/venue%2F1/courts/court%202";
  assert.deepEqual(adminEndpoints.courtLayout(venue, court), { method: "GET", path: `${encodedBase}/layout` });
  assert.deepEqual(adminEndpoints.updateCourtLayout(venue, court), { method: "PUT", path: `${encodedBase}/layout` });
  assert.deepEqual(adminEndpoints.createCourtRule(venue, court), { method: "POST", path: `${encodedBase}/rules` });
  assert.deepEqual(adminEndpoints.deleteCourtRule(venue, court, "rule 4"), { method: "DELETE", path: `${encodedBase}/rules/rule%204` });
  assert.deepEqual(adminEndpoints.courtSport(venue, court, sport, "PUT"), { method: "PUT", path: `${encodedBase}/sports/sport%2F3` });
  assert.deepEqual(adminEndpoints.courtEquipmentItem(venue, court, sport, "item 4", "DELETE"), { method: "DELETE", path: `${encodedBase}/sports/sport%2F3/equipment/item%204` });
  assert.deepEqual(adminEndpoints.createBasePricing(venue, court, sport), { method: "POST", path: `${encodedBase}/sports/sport%2F3/pricing/base` });
  assert.deepEqual(adminEndpoints.courtPricingGroup(venue, court, sport, "group 4", "PUT"), { method: "PUT", path: `${encodedBase}/sports/sport%2F3/pricing/groups/group%204` });
  assert.deepEqual(adminEndpoints.courtPricingRule(venue, court, sport, "rule/5", "DELETE"), { method: "DELETE", path: `${encodedBase}/sports/sport%2F3/pricing/rule%2F5` });
});

test("discount and redemption routes remain venue scoped", () => {
  assert.deepEqual(adminEndpoints.createVenueDiscount("venue/1"), { method: "POST", path: "/api/admin/v1/venues/venue%2F1/discounts" });
  assert.deepEqual(adminEndpoints.venueDiscount("venue/1", "discount 2", "PUT"), { method: "PUT", path: "/api/admin/v1/venues/venue%2F1/discounts/discount%202" });
  assert.deepEqual(adminEndpoints.promotionRedemptions("venue/1", "promo/2"), { method: "GET", path: "/api/admin/v1/venues/venue%2F1/promotions/promo%2F2/redemptions" });
});
