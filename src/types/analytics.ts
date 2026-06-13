/**
 * Analytics types — mirror the spec in requests/backend-api-needs.md.
 *
 * These shapes are what the Spring Boot backend will return once the
 * endpoints requested in that document are implemented. Until then, the
 * analytics widgets render "awaiting endpoint" empty states (no mock data).
 */

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "NO_SHOW"
  | "COMPLETED";

export interface BookingStatsResponse {
  totalBookings: number;
  confirmed: number;
  cancelled: number;
  noShow: number;
  completed: number;
  cancellationRate: number; // percent, 0-100
  noShowRate: number;
  avgLeadTimeHours: number;
  avgBookingValue: number;
}

export interface VenueUtilizationResponse {
  venueId: string;
  venueName: string;
  periodStart: string;
  periodEnd: string;
  availableHours: number;
  bookedHours: number;
  utilizationPercent: number;
  bookingCount: number;
  peakDayOfWeek?: number;
  peakHourOfDay?: number;
}

export interface HeatmapCell {
  dayOfWeek: number; // 0 = Sunday
  hourOfDay: number; // 0-23
  bookingCount: number;
  revenue: number;
}

export type HeatmapResponse = HeatmapCell[];

export interface RevenueBucket {
  bucket: string;
  revenue: number;
  bookingCount: number;
  invoiceCount: number;
}

export type RevenueGroupedResponse = RevenueBucket[];

export interface VenueRatingTrendPoint {
  periodEnd: string; // "YYYY-MM"
  avgRating: number;
  reviewCount: number;
}

export interface VenueRatingTrendResponse {
  venueId: string | null; // null = platform-wide
  points: VenueRatingTrendPoint[];
  currentRating: number;
  previousRating: number;
  delta: number;
}
