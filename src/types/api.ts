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
export type UserRole = "CUSTOMER" | "VENUE_MANAGER" | "STAFF" | "ADMIN";
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

// Player reporting
export interface MoneyAmount {
  currencyCode: string;
  amount: number;
}

export type PlayerSortBy =
  | "NAME"
  | "EMAIL"
  | "REGISTRATION_DATE"
  | "TOTAL_RESERVATIONS"
  | "PAID_RESERVATIONS"
  | "LAST_BOOKING_DATE";

export type SortDirection = "ASC" | "DESC";

/** Stable client model returned by the admin player-reporting directory. */
export interface PlayerReportItem {
  playerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
  accountStatus: UserStatus;
  registrationDate: string;
  totalReservations: number;
  confirmedReservations: number;
  completedReservations: number;
  cancelledReservations: number;
  noShowReservations: number;
  paidReservations: number;
  grossPaid: MoneyAmount[];
  netPaid: MoneyAmount[];
  lastBookingDate?: string | null;
}

export interface PlayerDirectoryQuery {
  q?: string;
  accountStatus?: UserStatus[];
  registeredFrom?: string;
  registeredTo?: string;
  reservationStatus?: string[];
  paid?: boolean;
  sortBy?: PlayerSortBy;
  direction?: SortDirection;
  page?: number;
  size?: number;
}

/** One reservation aggregate in a player's grouped booking history. */
export interface PlayerBookingGroup {
  reservationId: string;
  overallStatus: string;
  statuses: string[];
  paid: boolean;
  paymentStatuses: string[];
  paymentMethods: string[];
  sessionsCount: number;
  durationMinutes: number;
  totalAmounts: MoneyAmount[];
  grossPaid: MoneyAmount[];
  netPaid: MoneyAmount[];
  venueId: string;
  venueName: string;
  courtId: string;
  courtName: string;
  startAt: string;
  endAt: string;
}

export interface PlayerBookingHistoryQuery {
  from?: string;
  to?: string;
  reservationStatus?: string[];
  paymentStatus?: string[];
  venueId?: string;
  direction?: SortDirection;
  page?: number;
  size?: number;
}

/** Account that is still inside the backend's one-month restoration window. */
export interface RestorableAccountDto {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
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

export type StaffPermission =
  | "VENUE_READ"
  | "VENUE_WRITE"
  | "COURTS_READ"
  | "COURTS_WRITE"
  | "COURTS_DELETE"
  | "BOOKINGS_READ"
  | "BOOKINGS_WRITE"
  | "BOOKINGS_APPROVE"
  | "BOOKINGS_CANCEL"
  | "BOOKINGS_DELETE"
  | "CUSTOMERS_READ"
  | "CUSTOMERS_WRITE"
  | "CUSTOMERS_BLOCK"
  | "PROMOTIONS_READ"
  | "PROMOTIONS_WRITE"
  | "PROMOTIONS_DELETE"
  | "FINANCE_READ"
  | "FINANCE_WRITE"
  | "REPORTS_READ"
  | "NOTIFICATIONS_READ"
  | "NOTIFICATIONS_WRITE"
  | "NOTIFICATIONS_SEND";

export interface VenueStaffAssignmentRequest {
  venueId: number;
  permissions: StaffPermission[];
}

export interface CreateVenueStaffRequest {
  firstName: string;
  lastName: string;
  email: string;
  tempPassword: string;
  venueAssignments: VenueStaffAssignmentRequest[];
}

export interface VenueStaffAccess {
  venueId: number;
  venueName: string;
  relationship: "STAFF";
  permissions: StaffPermission[];
  canManageUsers: boolean;
  immutableOwner: boolean;
}

export interface StaffUserDto extends Omit<UserDto, "role"> {
  // Staff accounts currently inherit the VENUE_MANAGER backend role while
  // their venue relationship and permissions identify them as staff.
  role: "STAFF" | "VENUE_MANAGER";
  forcePasswordChange: boolean;
  venueAccess: VenueStaffAccess[];
}

export interface UpdateVenueStaffRequest {
  venueAssignments: VenueStaffAssignmentRequest[];
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
  whishPaymentLink?: string | null;
  coverImageUrl?: string;
  currencyCode: string;
  status: VenueStatus;
  paymentMode?: PaymentMode;
  venueRating?: number;
  autoConfirmation: boolean;
  allowRecurringBookings: boolean;
  maxAdvanceBookingDays: number;
  courtLimit?: number;
  courtCount?: number;
  facilities: string[];
  availability?: VenueAvailabilitySchedule;
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

// Weekly operating hours. The backend may return either full Java DayOfWeek
// names or three-letter codes; the client normalizes both to these full names.
// Minutes are venue-local. An overnight close may exceed 1440.
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
  // Optional on create. When present, the backend accepts only an HTTP(S) URL
  // up to 2048 characters.
  whishPaymentLink?: string | null;
  currencyCode: string;
  paymentMode: PaymentMode;
  autoConfirmation: boolean;
  allowRecurringBookings?: boolean;
  // Max number of courts the venue may host. Required by the backend.
  courtLimit?: number;
  maxAdvanceBookingDays?: number;
  facilities?: Facility[];
  availability?: VenueAvailabilitySchedule;
}

// PUT /api/admin/v1/venues/{venueId} (application/json). Payment mode is
// required; the remaining fields are partial updates. Currency, manager, and
// cover image are managed via create / separate endpoints.
export interface UpdateVenueRequest {
  paymentMode: PaymentMode;
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
  // The API wrapper always sends either a trimmed URL or null.
  whishPaymentLink?: string | null;
  autoConfirmation?: boolean;
  allowRecurringBookings?: boolean;
  maxAdvanceBookingDays?: number;
  facilities?: Facility[];
  availability?: VenueAvailabilitySchedule;
}

// GET and PUT /api/admin/v1/venues/{venueId} return
// VenueResponse. It is richer than VenueDetailResponse and notably carries
// `availability` and `paymentMode`. Used to prefill and save the edit form.
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
  whishPaymentLink?: string | null;
  coverImageUrl?: string;
  currencyCode: string;
  status: VenueStatus;
  paymentMode?: PaymentMode;
  autoConfirmation: boolean;
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

export interface InvoiceLineResponse {
  contractId: string;
  servicePeriodStart: string;
  servicePeriodEnd: string;
  feeModel: InvoiceFeeModel;
  fixedMonthlyFee?: number | null;
  perReservationFee?: number | null;
  coveredDays: number;
  daysInMonth: number;
  totalBookings: number;
  totalRevenue: number;
  amountDue: number;
  currencyCode: string;
}

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
  feeModel?: InvoiceFeeModel | null;
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
  // Optional during the backend rollout. The API normalization boundary
  // defaults an absent value to [] for consumers.
  lines?: InvoiceLineResponse[];
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

// Audit events
export type AuditEventOutcome =
  | "SUCCESS"
  | "FAILURE"
  | "DENIED"
  | "UNKNOWN";

/**
 * Stable dashboard model for a platform audit event. The API wrapper
 * normalizes backend naming differences (for example `timestamp` vs
 * `createdAt`) before this reaches a page.
 */
export interface AuditEvent {
  id: string;
  occurredAt: string;
  summary?: string | null;
  category?: string | null;
  scope?: string | null;
  action: string;
  outcome: AuditEventOutcome;
  actorId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  affectedUserId?: string | null;
  affectedUserName?: string | null;
  venueId?: string | null;
  venueName?: string | null;
  bookingId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  requestMethod?: string | null;
  requestPath?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  traceId?: string | null;
  reason?: string | null;
  metadata?: unknown;
  before?: unknown;
  after?: unknown;
  raw: Record<string, unknown>;
}

export interface AuditEventFilters {
  actorId?: string;
  actorEmail?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  outcome?: Exclude<AuditEventOutcome, "UNKNOWN">;
  from?: string;
  to?: string;
}

export interface AuditEventQuery extends AuditEventFilters {
  page?: number;
  size?: number;
  sort?: string;
}
