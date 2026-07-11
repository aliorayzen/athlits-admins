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
  // Backend user DTOs for admin user-management endpoints currently omit
  // timestamps. Consumers must tolerate them being absent.
  createdAt?: string;
  updatedAt?: string;
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

/** Customer account that is still inside the backend's restoration window. */
export interface RestorableCustomerDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  profilePictureUrl?: string | null;
  deletionRequestedAt: string;
  permanentDeletionAt: string;
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

export interface UpdateVenueManagerRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

// Venues
export type VenueStatus = "ACTIVE" | "SUSPENDED";

// NOTE: every venue-returning backend endpoint now carries bilingual names
// (`nameEn` / `nameAr`) — there is no single `name` on the wire. `name` below
// is a CLIENT-DERIVED display field set at the api.ts normalize boundary
// (English-primary, Arabic fallback) so display-only consumers can keep
// reading `.name` unchanged.
export interface VenueSummaryResponse {
  id: string;
  nameEn: string;
  nameAr: string;
  /** Client-derived display name (nameEn ?? nameAr). Not sent by the backend. */
  name: string;
  slug: string;
  city: string;
  countryCode: string;
  coverImageUrl?: string;
  status: VenueStatus;
  venueRating?: number;
  // Number of courts registered to the venue — lets the list render a Courts
  // column without a per-row fetch.
  courtCount?: number;
  createdAt: string;
}

export interface VenueDetailResponse {
  id: string;
  nameEn: string;
  nameAr: string;
  /** Client-derived display name (nameEn ?? nameAr). Not sent by the backend. */
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
  courtCount?: number;
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

// POST /api/admin/v1/venues accepts multipart/form-data. The optional cover
// image File is passed separately to createVenue so this DTO stays serializable.
export interface CreateVenueRequest {
  managerId: string;
  nameEn: string;
  nameAr: string;
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
  nameEn?: string;
  nameAr?: string;
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
  nameEn: string;
  nameAr: string;
  /** Client-derived display name (nameEn ?? nameAr). Not sent by the backend. */
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
  "GRASS" | "CLAY" | "HARD" | "SYNTHETIC" | "WOOD" | "RUBBER" | "SAND" | "TURF";
export type CourtEnvironment = "INDOOR" | "OUTDOOR";

export interface CourtResponse {
  id: string;
  venueId: string;
  nameEn: string;
  nameAr: string;
  /** Client-derived display name (nameEn ?? nameAr). Not sent by the backend. */
  name: string;
  surfaceType: SurfaceType;
  environment: CourtEnvironment;
  active: boolean;
  // Backend returns sport identifiers as plain strings (e.g. "FOOTBALL").
  sports: string[];
}

// Invoices
export type InvoiceStatus = "GENERATED" | "PAID" | "OVERDUE" | "VOID";

// Invoice fee model is a DIFFERENT enum from the contract fee model: invoices
// bill either a fixed monthly fee or per reservation. (Contracts use
// COMMISSION | FIXED_MONTHLY — see `FeeModel` below.)
export type InvoiceFeeModel = "FIXED_MONTHLY" | "PER_RESERVATION";

export interface InvoiceResponse {
  id: string;
  venueId: string;
  // Backend now sends bilingual venue names; `venueName` is a client-derived
  // display field (nameEn ?? nameAr) set at the api.ts normalize boundary.
  venueNameEn?: string | null;
  venueNameAr?: string | null;
  venueName?: string;
  contractId?: string | null;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  totalBookings?: number;
  totalRevenue?: number;
  feeModel?: InvoiceFeeModel;
  fixedMonthlyFee?: number | null;
  perReservationFee?: number | null;
  // `amountDue` is the canonical amount on the wire. `amount` is kept as a
  // normalized alias so existing UI (which reads `.amount`) stays compatible.
  amountDue?: number;
  amount: number;
  currencyCode: string;
  status: InvoiceStatus;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  paidAt?: string | null;
  paymentReference?: string | null;
  createdAt: string;
}

export interface MarkPaidRequest {
  paymentReference: string;
}

// Bulk invoice operations support partial success: each id either lands in
// `succeeded` (with the updated invoice) or `failed` (with a reason).
export interface BulkMarkPaidRequest {
  ids: string[];
  paymentReference: string;
}

export interface BulkVoidRequest {
  ids: string[];
  reason?: string;
}

export interface BulkRemindRequest {
  ids: string[];
}

export interface BulkInvoiceFailure {
  id: string;
  reason: string;
}

export interface BulkInvoiceResult {
  succeeded: InvoiceResponse[];
  failed: BulkInvoiceFailure[];
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
  currencyCode: string | null;
}

export interface InvoiceKpisResponse {
  summary: InvoiceKpiSummary;
}

// Server-side invoice filters. `GET /api/admin/v1/invoices` and
// `GET /api/admin/v1/invoices/export` accept the same set. Date fields are ISO
// dates (billing/due) or ISO datetimes (paid). Venue-name fields stay for the
// English-primary search box; `venueId` filters by exact id.
export interface InvoiceFilters {
  venueNameEn?: string;
  venueNameAr?: string;
  venueId?: string;
  status?: InvoiceStatus;
  billingFrom?: string;
  billingTo?: string;
  dueFrom?: string;
  dueTo?: string;
  paidAfter?: string;
  paidBefore?: string;
}

export type InvoiceExportFormat = "csv" | "pdf";

// Suspend a venue manager straight from one of their OVERDUE invoices. The
// backend rejects non-overdue invoices with 409. `reason` is audit-logged.
export interface SuspendVenueManagerRequest {
  reason?: string;
}

export type VenueManagerSuspensionStatus = "SUSPENDED" | "REACTIVATED";

// Result envelope for suspend/reactivate-venue-manager. `affected*Ids` report
// every venue/court the action toggled, so the UI can summarize the blast
// radius ("disabled 2 venues, 5 courts").
export interface VenueManagerSuspensionResult {
  invoice: InvoiceResponse;
  venueManager: UserDto;
  affectedVenueIds: number[];
  affectedCourtIds: number[];
  status: VenueManagerSuspensionStatus;
}

// Contracts
export type FeeModel = "PER_RESERVATION" | "FIXED_MONTHLY";

export interface ContractResponse {
  id: string;
  venueId: string;
  feeModel: FeeModel;
  perReservationFee?: number | null;
  fixedMonthlyFee?: number | null;
  currencyCode: string;
  gracePeriodDays: number;
  startDate: string;
  endDate?: string | null;
  active: boolean;
  createdAt: string;
}

export interface CreateContractRequest {
  feeModel: FeeModel;
  perReservationFee: number | null;
  fixedMonthlyFee: number | null;
  currencyCode: string;
  gracePeriodDays: number;
  startDate: string;
  endDate: string | null;
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
