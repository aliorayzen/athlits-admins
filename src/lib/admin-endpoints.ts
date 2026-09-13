export interface AdminEndpoint {
  method: "DELETE" | "GET" | "POST" | "PUT";
  path: string;
}

function segment(value: string): string {
  return encodeURIComponent(value);
}

export const adminEndpoints = {
  runStoreImport(platform: string): AdminEndpoint {
    return {
      method: "POST",
      path: `/api/admin/v1/store-analytics/imports/${segment(platform)}/run`,
    };
  },
  removeVenueManagerStaff(
    managerId: string,
    staffUserId: string,
  ): AdminEndpoint {
    return {
      method: "DELETE",
      path: `/api/admin/v1/users/venue-managers/${segment(managerId)}/staff/${segment(staffUserId)}`,
    };
  },
  updateVenueContract(venueId: string, contractId: string): AdminEndpoint {
    return {
      method: "PUT",
      path: `/api/admin/v1/venues/${segment(venueId)}/contracts/${segment(contractId)}`,
    };
  },
  deleteCourt(venueId: string, courtId: string): AdminEndpoint {
    return {
      method: "DELETE",
      path: `/api/admin/v1/venues/${segment(venueId)}/courts/${segment(courtId)}`,
    };
  },
  blockUser(userId: string): AdminEndpoint {
    return {
      method: "PUT",
      path: `/api/admin/v1/users/${segment(userId)}/block`,
    };
  },
  venueAvailability(venueId: string): AdminEndpoint {
    return {
      method: "GET",
      path: `/api/admin/v1/venues/${segment(venueId)}/availability`,
    };
  },
  venueBlackouts(venueId: string): AdminEndpoint {
    return {
      method: "GET",
      path: `/api/admin/v1/venues/${segment(venueId)}/blackout-dates`,
    };
  },
  checkVenueBlackout(venueId: string): AdminEndpoint {
    return {
      method: "POST",
      path: `/api/admin/v1/venues/${segment(venueId)}/blackout-dates/check`,
    };
  },
  confirmVenueBlackout(venueId: string): AdminEndpoint {
    return {
      method: "POST",
      path: `/api/admin/v1/venues/${segment(venueId)}/blackout-dates/confirm`,
    };
  },
  deleteVenueBlackout(venueId: string, blackoutId: string): AdminEndpoint {
    return {
      method: "DELETE",
      path: `/api/admin/v1/venues/${segment(venueId)}/blackout-dates/${segment(blackoutId)}`,
    };
  },
  updateCourtLimit(venueId: string): AdminEndpoint {
    return {
      method: "PUT",
      path: `/api/admin/v1/venues/${segment(venueId)}/court-limit`,
    };
  },
  courtAvailability(venueId: string, courtId: string): AdminEndpoint {
    return {
      method: "GET",
      path: `/api/admin/v1/venues/${segment(venueId)}/courts/${segment(courtId)}/availability`,
    };
  },
  updateCourtAvailability(venueId: string, courtId: string): AdminEndpoint {
    return {
      method: "PUT",
      path: `/api/admin/v1/venues/${segment(venueId)}/courts/${segment(courtId)}/availability`,
    };
  },
  courtConflicts(venueId: string, courtId: string): AdminEndpoint {
    return {
      method: "GET",
      path: `/api/admin/v1/venues/${segment(venueId)}/courts/${segment(courtId)}/conflicts`,
    };
  },
  courtLayout: (venueId: string, courtId: string): AdminEndpoint => ({ method: "GET", path: `/api/admin/v1/venues/${segment(venueId)}/courts/${segment(courtId)}/layout` }),
  updateCourtLayout: (venueId: string, courtId: string): AdminEndpoint => ({ method: "PUT", path: `/api/admin/v1/venues/${segment(venueId)}/courts/${segment(courtId)}/layout` }),
  courtRules: (venueId: string, courtId: string): AdminEndpoint => ({ method: "GET", path: `/api/admin/v1/venues/${segment(venueId)}/courts/${segment(courtId)}/rules` }),
  createCourtRule: (venueId: string, courtId: string): AdminEndpoint => ({ method: "POST", path: `/api/admin/v1/venues/${segment(venueId)}/courts/${segment(courtId)}/rules` }),
  deleteCourtRule: (venueId: string, courtId: string, ruleId: string): AdminEndpoint => ({ method: "DELETE", path: `/api/admin/v1/venues/${segment(venueId)}/courts/${segment(courtId)}/rules/${segment(ruleId)}` }),
  courtSports: (venueId: string, courtId: string): AdminEndpoint => ({ method: "GET", path: `/api/admin/v1/venues/${segment(venueId)}/courts/${segment(courtId)}/sports` }),
  createCourtSport: (venueId: string, courtId: string): AdminEndpoint => ({ method: "POST", path: `/api/admin/v1/venues/${segment(venueId)}/courts/${segment(courtId)}/sports` }),
  courtSport: (venueId: string, courtId: string, sportId: string, method: "DELETE" | "PUT"): AdminEndpoint => ({ method, path: `/api/admin/v1/venues/${segment(venueId)}/courts/${segment(courtId)}/sports/${segment(sportId)}` }),
  courtEquipment: (venueId: string, courtId: string, sportId: string): AdminEndpoint => ({ method: "GET", path: `/api/admin/v1/venues/${segment(venueId)}/courts/${segment(courtId)}/sports/${segment(sportId)}/equipment` }),
  createCourtEquipment: (venueId: string, courtId: string, sportId: string): AdminEndpoint => ({ method: "POST", path: `/api/admin/v1/venues/${segment(venueId)}/courts/${segment(courtId)}/sports/${segment(sportId)}/equipment` }),
  courtEquipmentItem: (venueId: string, courtId: string, sportId: string, equipmentId: string, method: "DELETE" | "PUT"): AdminEndpoint => ({ method, path: `/api/admin/v1/venues/${segment(venueId)}/courts/${segment(courtId)}/sports/${segment(sportId)}/equipment/${segment(equipmentId)}` }),
  courtPricing: (venueId: string, courtId: string, sportId: string): AdminEndpoint => ({ method: "GET", path: `/api/admin/v1/venues/${segment(venueId)}/courts/${segment(courtId)}/sports/${segment(sportId)}/pricing` }),
  createCourtPricing: (venueId: string, courtId: string, sportId: string): AdminEndpoint => ({ method: "POST", path: `/api/admin/v1/venues/${segment(venueId)}/courts/${segment(courtId)}/sports/${segment(sportId)}/pricing` }),
  createBasePricing: (venueId: string, courtId: string, sportId: string): AdminEndpoint => ({ method: "POST", path: `/api/admin/v1/venues/${segment(venueId)}/courts/${segment(courtId)}/sports/${segment(sportId)}/pricing/base` }),
  courtPricingRule: (venueId: string, courtId: string, sportId: string, ruleId: string, method: "DELETE" | "PUT"): AdminEndpoint => ({ method, path: `/api/admin/v1/venues/${segment(venueId)}/courts/${segment(courtId)}/sports/${segment(sportId)}/pricing/${segment(ruleId)}` }),
  courtPricingGroup: (venueId: string, courtId: string, sportId: string, groupId: string, method: "DELETE" | "PUT"): AdminEndpoint => ({ method, path: `/api/admin/v1/venues/${segment(venueId)}/courts/${segment(courtId)}/sports/${segment(sportId)}/pricing/groups/${segment(groupId)}` }),
  venueDiscounts: (venueId: string): AdminEndpoint => ({ method: "GET", path: `/api/admin/v1/venues/${segment(venueId)}/discounts` }),
  createVenueDiscount: (venueId: string): AdminEndpoint => ({ method: "POST", path: `/api/admin/v1/venues/${segment(venueId)}/discounts` }),
  venueDiscount: (venueId: string, discountId: string, method: "DELETE" | "PUT"): AdminEndpoint => ({ method, path: `/api/admin/v1/venues/${segment(venueId)}/discounts/${segment(discountId)}` }),
  venuePromotions: (venueId: string): AdminEndpoint => ({ method: "GET", path: `/api/admin/v1/venues/${segment(venueId)}/promotions` }),
  promotionRedemptions: (venueId: string, promotionId: string): AdminEndpoint => ({ method: "GET", path: `/api/admin/v1/venues/${segment(venueId)}/promotions/${segment(promotionId)}/redemptions` }),
};
