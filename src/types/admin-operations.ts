import type { VenueAvailabilityDay, VenueResponse, Weekday } from "@/types/api";

export type CourtScheduleMode = "VENUE_HOURS" | "CUSTOM_HOURS";

export interface AvailabilityDayResponse extends VenueAvailabilityDay {
  available?: boolean;
  slotDurationMinutes?: number;
}

export interface AvailabilityRuleResponse {
  dayOfWeek: Weekday;
  startTime: string;
  endTime: string;
  endsNextDay: boolean;
  slotDurationMinutes: number;
  available: boolean;
}

export interface AvailabilityScheduleResponse {
  days: AvailabilityDayResponse[];
  rules: AvailabilityRuleResponse[];
  inheritsVenueSchedule: boolean;
  scheduleMode: CourtScheduleMode;
}

export interface AvailabilityScheduleRequest {
  scheduleMode: CourtScheduleMode;
  days: VenueAvailabilityDay[];
}

export type BlackoutScope =
  | "VENUE_WIDE"
  | "COURT_SPECIFIC"
  | "COURT_AREA_SPECIFIC";

export interface CreateBlackoutRequest {
  date: string;
  courtId?: number;
  courtAreaId?: number;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface BlackoutResponse extends CreateBlackoutRequest {
  id: string;
  venueId: string;
  scope: BlackoutScope;
}

export interface BlackoutImpactResponse {
  overlappingBookingCount: number;
  hasOverlappingBookings: boolean;
}

export interface ConfirmBlackoutResponse {
  blackout: BlackoutResponse;
  cancelledBookingCount: number;
}

export interface CourtConflictQuery {
  startTime: string;
  endTime: string;
}

export interface BookingConflictResponse {
  conflict: boolean;
  conflictingBookingIds: string[];
}

export interface UpdateVenueCourtLimitRequest {
  courtLimit: number;
}

export type UpdateVenueCourtLimitResponse = VenueResponse;

export type AdminCourtDivisionLayout = "FULL_ONLY" | "HALVES" | "HALVES_ONLY";
export interface CourtAreaResponse { id: number; courtId: number; parentAreaId?: number | null; code: string; nameEn?: string | null; nameAr?: string | null; sortOrder: number; active: boolean }
export interface CourtLayoutResponse { courtId: number; divisionLayout: AdminCourtDivisionLayout; areas: CourtAreaResponse[] }
export interface CourtRuleRequest { title: string; description: string }
export interface CourtRuleResponse extends CourtRuleRequest { id: number }
export interface BookingOptionResponse { id: number; durationMinutes: number; default: boolean; active: boolean }
export interface BookingOptionRequest { id?: number; durationMinutes: number; default: boolean; active: boolean }
export interface CourtSportResponse { id: number; courtId: number; courtAreaId?: number | null; courtAreaCode?: string | null; courtAreaName?: string | null; sportType: string; capacity: number; sessionDurationMinutes: number; startIntervalMinutes: number; bookingOptions: BookingOptionResponse[]; active: boolean }
export interface CreateCourtSportRequest { sportType: string; courtAreaCode?: string; capacity?: number; sessionDurationMinutes: number; startIntervalMinutes?: number; bookingOptions?: BookingOptionRequest[] }
export type UpdateCourtSportRequest = Omit<CreateCourtSportRequest, "sportType" | "courtAreaCode">;
export interface EquipmentPriceTier { minimumQuantity: number; maximumQuantity: number; flatPrice: number; currencyCode?: string }
export interface EquipmentRequest { nameEn: string; nameAr: string; stockQuantity: number; perReservationLimit: number; active: boolean; priceTiers: EquipmentPriceTier[] }
export interface EquipmentResponse extends EquipmentRequest { id: number; courtSportId: number; courtId: number; sportType: string; pricingVersion: number }
export interface PricingRuleRequest { name?: string; dayOfWeek: Weekday; startTime: string; endTime: string; endsNextDay?: boolean; priceAmount?: number; currencyCode: string; effectiveFrom: string; effectiveTo?: string; optionPrices?: Array<{ bookingOptionId: number; priceAmount: number }> }
export interface UpdatePricingRuleRequest extends Omit<PricingRuleRequest, "endsNextDay" | "optionPrices"> { priceAmount: number }
export type BasePricingRequest = Omit<PricingRuleRequest, "dayOfWeek">;
export interface PricingRuleResponse extends Omit<PricingRuleRequest, "priceAmount"> { id: number; ruleType: string; courtSportId: number; bookingOptionId?: number | null; pricingRuleGroupId?: number | null; priceAmount: number; timeZoneId: string; active: boolean }
export type VenueDiscountKind = "PERCENT_OFF" | "FIXED_AMOUNT_OFF";
export interface VenueDiscountRequest { titleEn?: string; titleAr?: string; descriptionEn?: string; descriptionAr?: string; kind: VenueDiscountKind; percentOff?: number; amountOff?: number; currencyCode?: string; validFrom?: string; validTo?: string; courtIds?: number[]; active?: boolean }
export interface VenueDiscountResponse extends VenueDiscountRequest { id: number; venueId: number; active: boolean; currentlyValid: boolean; courts: Array<{ id: number; nameEn?: string; nameAr?: string }> }
export interface VenuePromotionResponse { id: number; code: string; kind: string; percentOff?: number; currencyCode?: string; validFrom?: string; validTo?: string; redemptionCount: number; remainingRedemptions?: number | null; active: boolean }
export interface PromotionRedemption { reservationId: string; playerId: number; promotionCode: string; discountAmount: number; status: string; redeemedAt: string; releasedAt?: string | null }
export interface PageResponse<T> { content: T[]; number: number; size: number; totalElements: number; totalPages: number; first: boolean; last: boolean }
