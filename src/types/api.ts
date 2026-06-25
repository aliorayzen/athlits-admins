// API response envelope used by the Spring Boot backend on EVERY response.
// The axios response interceptor in src/lib/api-client.ts auto-unwraps this
// at runtime so call sites can keep typing the inner payload directly via
// `apiClient.post<AuthResponse>(...)`.
export interface ApiEnvelope<T> {
  data: T;
  message: string | null;
  errors: unknown | null;
}

// Auth
export interface AdminLoginRequest {
  email: string;
}

export interface AdminVerifyOtpRequest {
  email: string;
  otp: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
  forcePasswordChange?: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// Users
export type UserRole = "CUSTOMER" | "VENUE_MANAGER" | "ADMIN";
export type UserStatus =
  | "PENDING_PHONE_VERIFICATION"
  | "PENDING_SIGNUP_COMPLETION"
  | "PENDING_EMAIL_VERIFICATION"
  | "ACTIVE"
  | "DISABLED";

export type LanguagePreference = "EN" | "AR" | "FR" | "ES" | "DE";

export interface UserDto {
  // Backend serializes admin user ids as integers; we coerce to string at the
  // api wrapper boundary so consumer code can keep treating ids as strings.
  id: string;
  email: string;
  phoneNumber?: string | null;
  firstName: string;
  lastName: string;
  profilePictureUrl?: string | null;
  role: UserRole;
  status: UserStatus;
  // Present on full user fetches; the login response omits these and the api
  // wrapper fills them with sentinel values so consumers never see `undefined`.
  createdAt: string;
  updatedAt: string;
  // Extended profile fields, all nullable from the backend.
  languagePreference?: LanguagePreference;
  phoneVerified?: boolean;
  gender?: string | null;
  dateOfBirth?: string | null;
  countryCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  sportsInterests?: string[];
}

export interface CreateAdminRequest {
  email: string;
  firstName: string;
  lastName: string;
}

export interface CreateVmUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  tempPassword: string;
}

// Venues
export type VenueStatus = "ACTIVE" | "SUSPENDED";

export interface VenueSummaryResponse {
  id: string;
  name: string;
  slug: string;
  city: string;
  countryCode: string;
  coverImageUrl?: string;
  status: VenueStatus;
  venueRating?: number;
  createdAt: string;
}

export interface VenueDetailResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  addressLine: string;
  city: string;
  timeZoneId?: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  contactPhone?: string;
  contactEmail?: string;
  coverImageUrl?: string;
  currencyCode: string;
  status: VenueStatus;
  venueRating?: number;
  autoConfirmation: boolean;
  allowRecurringBookings: boolean;
  maxAdvanceBookingDays: number;
  courtLimit?: number;
  facilities: string[];
  managerId?: string;
  createdByAdminId?: string;
  courts: CourtResponse[];
  createdAt: string;
  updatedAt: string;
}

// How a venue accepts payment (backend enum).
export type PaymentMode = "CASH" | "ONLINE" | "BOTH";

// Facilities a venue can offer (backend enum).
export type Facility =
  | "CAFETERIA"
  | "PARKING"
  | "SHOWERS"
  | "LOCKERS"
  | "STORES"
  | "WIFI"
  | "LIGHTING"
  | "SEATING"
  | "CHANGING_ROOMS";

// Weekly operating hours (backend AvailabilityScheduleRequest). Weekdays use
// Java DayOfWeek names; open/close are minutes from midnight (e.g. 480 = 08:00).
export type Weekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface VenueAvailabilityDay {
  weekday: Weekday;
  openMinutes: number;
  closeMinutes: number;
}

// Optional on create, but when sent `days` must contain at least one entry.
export interface VenueAvailabilitySchedule {
  days: VenueAvailabilityDay[];
}

// POST /api/admin/v1/venues is application/json. `managerId`, `paymentMode`,
// `timeZoneId`, and `courtLimit` are required by the backend; `coverImage` is a
// URL string (the backend stores the image elsewhere and keeps only the link).
export interface CreateVenueRequest {
  managerId: string;
  name: string;
  description?: string;
  addressLine: string;
  city: string;
  // IANA time-zone id the venue operates in, e.g. "Asia/Riyadh". Availability
  // hours are interpreted against it.
  timeZoneId: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  contactPhone?: string;
  contactEmail?: string;
  // Public URL of the cover image, not a file upload.
  coverImage?: string;
  currencyCode: string;
  paymentMode: PaymentMode;
  allowRecurringBookings?: boolean;
  // Max number of courts the venue may host. Required by the backend.
  courtLimit?: number;
  maxAdvanceBookingDays?: number;
  facilities?: Facility[];
  availability?: VenueAvailabilitySchedule;
}

// PUT /api/vm/v1/venues/{venueId} (application/json). Every field is optional —
// only the provided fields are updated. The admin API has no venue-edit
// endpoint, so the admin dashboard targets this venue-manager endpoint. Note:
// currency, payment mode, manager, and cover image are NOT editable here (the
// backend manages those via create / separate endpoints).
export interface UpdateVenueRequest {
  name?: string;
  description?: string;
  addressLine?: string;
  city?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  contactPhone?: string;
  contactEmail?: string;
  allowRecurringBookings?: boolean;
  maxAdvanceBookingDays?: number;
  facilities?: Facility[];
  availability?: VenueAvailabilitySchedule;
}

// GET/PUT /api/admin/v1/venues/{venueId} → VenueResponse. Richer than
// VenueDetailResponse: notably carries `availability` and `paymentMode`.
// Used to prefill and save the venue edit form.
export interface VenueResponse {
  id: string;
  managerId?: string;
  name: string;
  slug: string;
  description?: string;
  addressLine: string;
  city: string;
  timeZoneId?: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  contactPhone?: string;
  contactEmail?: string;
  coverImageUrl?: string;
  currencyCode: string;
  status: VenueStatus;
  paymentMode?: PaymentMode;
  allowRecurringBookings: boolean;
  maxAdvanceBookingDays: number;
  courtLimit?: number;
  facilities: Facility[];
  availability?: VenueAvailabilitySchedule;
}

export interface SetVenueStatusRequest {
  status: VenueStatus;
}

export interface AssignManagerRequest {
  managerId: string;
}

// Courts
export type SurfaceType =
  | "GRASS"
  | "CLAY"
  | "HARD"
  | "SYNTHETIC"
  | "WOOD"
  | "RUBBER"
  | "SAND"
  | "TURF";
export type CourtEnvironment = "INDOOR" | "OUTDOOR";

export interface CourtResponse {
  id: string;
  name: string;
  surfaceType: SurfaceType;
  environment: CourtEnvironment;
  active: boolean;
  sports: CourtSportResponse[];
}

export interface CourtSportResponse {
  id: string;
  sportType: string;
  capacity: number;
  sessionDurationMinutes: number;
  active: boolean;
}

// Invoices
export type InvoiceStatus = "GENERATED" | "PAID" | "OVERDUE" | "VOID";

export interface InvoiceResponse {
  id: string;
  venueId: string;
  contractId?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  totalBookings?: number;
  totalRevenue?: number;
  feeModel?: FeeModel;
  commissionRate?: number;
  fixedMonthlyFee?: number;
  amountDue?: number;
  venueName?: string;
  amount: number;
  currencyCode: string;
  status: InvoiceStatus;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  paidAt?: string;
  paymentReference?: string;
  createdAt: string;
}

export interface MarkPaidRequest {
  paymentReference: string;
}

export interface DuePaymentsResponse {
  totalDueCount: number;
  totalAmountDue: number;
  dashboardUrl?: string;
  invoices: InvoiceResponse[];
}

export interface InvoiceKpiSummary {
  outstandingAmount: number;
  outstandingCount: number;
  collectedMtdAmount: number;
  overdueAmount: number;
  overdueCount: number;
  avgCollectionDays: number | null;
  currencyCode: string;
}

export interface InvoiceKpisResponse {
  summary: InvoiceKpiSummary;
}

// Contracts
export type FeeModel = "COMMISSION" | "FIXED_MONTHLY";

export interface ContractResponse {
  id: string;
  venueId: string;
  feeModel: FeeModel;
  commissionRate?: number;
  fixedMonthlyFee?: number;
  currencyCode: string;
  gracePeriodDays: number;
  startDate: string;
  endDate?: string;
  active: boolean;
  createdAt: string;
}

export interface CreateContractRequest {
  feeModel: FeeModel;
  commissionRate?: number;
  fixedMonthlyFee?: number;
  currencyCode: string;
  gracePeriodDays: number;
  startDate: string;
  endDate?: string;
}

// Pagination
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  // Spring's Page also returns these flags; optional so existing consumers
  // (e.g. invoices) that don't read them stay compatible.
  numberOfElements?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}

// Query params for Spring `Pageable` endpoints. The resolver binds the flat
// `page` / `size` / `sort` query params; `sort` is "field,dir" e.g. "firstName,asc".
export interface PageQuery {
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}
