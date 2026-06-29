import axios from "axios";
import { apiClient } from "./api-client";
import type {
  AdminLoginRequest,
  AdminVerifyOtpRequest,
  ApiEnvelope,
  AuthResponse,
  CreateAdminRequest,
  CreateVenueRequest,
  CreateVmUserRequest,
  AssignManagerRequest,
  SetVenueStatusRequest,
  UpdateVenueRequest,
  VenueDetailResponse,
  VenueResponse,
  VenueSummaryResponse,
  UserDto,
  DuePaymentsResponse,
  InvoiceKpisResponse,
  InvoiceKpiSummary,
  InvoiceResponse,
  InvoiceStatus,
  MarkPaidRequest,
  BulkInvoiceResult,
  PageResponse,
  PageQuery,
  ContractResponse,
  CreateContractRequest,
} from "@/types/api";

// ── Error helpers ────────────────────────────
// Type-narrow an `unknown` thrown from the API layer into a user-facing message.
// Spring Boot conventionally returns `{ message: string }` or
// `{ error: string }` on failures; bean-validation failures additionally carry
// `errors: [{ field, message }]` in the envelope. We surface those field
// errors so the operator sees WHY a request was rejected, not just that it was.
interface ApiErrorBody {
  message?: string;
  error?: string;
  detail?: string;
  errors?: unknown;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

function parseFieldErrors(errors: unknown): ApiFieldError[] {
  if (!Array.isArray(errors)) return [];
  return errors.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { field, message } = entry as { field?: unknown; message?: unknown };
    if (typeof message !== "string" || message.trim().length === 0) return [];
    return [
      {
        field: typeof field === "string" ? field : "",
        message: message.trim(),
      },
    ];
  });
}

// Field-level validation errors, keyed by backend field name (e.g.
// "availability.days[0].weekday"). Empty when the failure wasn't validation.
export function getApiFieldErrors(err: unknown): ApiFieldError[] {
  if (!axios.isAxiosError(err)) return [];
  const body = err.response?.data as ApiErrorBody | string | undefined;
  if (!body || typeof body !== "object") return [];
  return parseFieldErrors(body.errors);
}

export function getApiFieldErrorMap(
  err: unknown,
  aliases: Record<string, string> = {},
): Record<string, string> {
  return getApiFieldErrors(err).reduce<Record<string, string>>(
    (acc, fieldError) => {
      const key = aliases[fieldError.field] ?? fieldError.field;
      if (key && !acc[key]) acc[key] = fieldError.message;
      return acc;
    },
    {},
  );
}

// When the backend gives us no usable message, map the HTTP status to copy that
// tells the operator what to do next instead of a generic "went wrong". Network
// failures (no response) get their own line.
function statusFallback(status: number | null, fallback: string): string {
  switch (status) {
    case 400:
      return "The request was rejected. Check the highlighted fields and try again.";
    case 401:
      return "Your session expired. Sign in again to continue.";
    case 403:
      return "You don't have permission to do this.";
    case 404:
      return "That record no longer exists. It may have been removed.";
    case 409:
      return "This conflicts with an existing record. A venue with these details may already exist.";
    case 422:
      return "Some values couldn't be processed. Review the fields and try again.";
    case 429:
      return "Too many requests. Wait a moment, then try again.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "The server ran into a problem. Try again shortly.";
    default:
      return fallback;
  }
}

export function getApiErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? null;
    const body = err.response?.data as ApiErrorBody | string | undefined;
    if (typeof body === "string" && body.trim().length > 0) return body;
    if (body && typeof body === "object") {
      const fieldErrors = parseFieldErrors(body.errors);
      const msg = body.message ?? body.error ?? body.detail;
      if (fieldErrors.length > 0) {
        const details = fieldErrors
          .map((fe) => (fe.field ? `${fe.field}: ${fe.message}` : fe.message))
          .join("; ");
        return typeof msg === "string" &&
          msg.trim().length > 0 &&
          !/^validation/i.test(msg.trim())
          ? `${msg.trim()}: ${details}`
          : details;
      }
      if (typeof msg === "string" && msg.trim().length > 0) return msg;
    }
    // No response at all → the request never reached the server.
    if (!err.response) {
      return "Couldn't reach the server. Check your connection and try again.";
    }
    return statusFallback(status, fallback);
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function getApiErrorStatus(err: unknown): number | null {
  return axios.isAxiosError(err) ? (err.response?.status ?? null) : null;
}

// Backend serializes resource ids as integers; our type system and UI helpers
// (hash gradients, Map keys, URL segments) all expect strings. We coerce at
// the wrapper boundary so consumer code never sees a number or undefined.

function ensureStringId(id: unknown): string {
  if (id === null || id === undefined) return "";
  return String(id);
}

// Backend venues/courts/invoices ship bilingual names (nameEn/nameAr) with no
// single `name`. We derive an English-primary display string at this boundary
// so display-only consumers can keep reading `.name` / `.venueName`.
function displayName(nameEn?: string | null, nameAr?: string | null): string {
  const en = nameEn?.trim();
  if (en) return en;
  const ar = nameAr?.trim();
  if (ar) return ar;
  return "";
}

function normalizeUser(user: UserDto): UserDto {
  return {
    ...user,
    id: ensureStringId(user.id),
  };
}

function normalizeVenueSummary(v: VenueSummaryResponse): VenueSummaryResponse {
  return {
    ...v,
    id: ensureStringId(v.id),
    name: displayName(v.nameEn, v.nameAr),
  };
}

function normalizeVenueDetail(v: VenueDetailResponse): VenueDetailResponse {
  return {
    ...v,
    id: ensureStringId(v.id),
    name: displayName(v.nameEn, v.nameAr),
    managerId: v.managerId ? ensureStringId(v.managerId) : v.managerId,
    createdByAdminId: v.createdByAdminId
      ? ensureStringId(v.createdByAdminId)
      : v.createdByAdminId,
    courts: (v.courts ?? []).map((c) => ({
      ...c,
      id: ensureStringId(c.id),
      venueId: c.venueId ? ensureStringId(c.venueId) : c.venueId,
      name: displayName(c.nameEn, c.nameAr),
    })),
  };
}

function normalizeInvoice(i: InvoiceResponse): InvoiceResponse {
  const now = new Date().toISOString();
  const id = ensureStringId(i.id);
  const venueId = ensureStringId(i.venueId);
  const contractId = i.contractId ? ensureStringId(i.contractId) : i.contractId;
  const venueName = i.venueName?.trim();
  const billingPeriodStart = i.billingPeriodStart ?? i.periodStart;
  const billingPeriodEnd = i.billingPeriodEnd ?? i.periodEnd;
  const amountDue = i.amountDue ?? i.amount ?? 0;
  const periodStart = i.periodStart ?? billingPeriodStart ?? i.dueDate ?? now;
  const periodEnd = i.periodEnd ?? billingPeriodEnd ?? i.dueDate ?? periodStart;

  return {
    ...i,
    id,
    venueId,
    contractId,
    // Prefer bilingual fields, but preserve a plain backend `venueName` when
    // invoices don't include `venueNameEn` / `venueNameAr`.
    venueName:
      displayName(i.venueNameEn, i.venueNameAr) || venueName || undefined,
    billingPeriodStart: billingPeriodStart ?? periodStart,
    billingPeriodEnd: billingPeriodEnd ?? periodEnd,
    amountDue,
    amount: i.amount ?? amountDue,
    periodStart,
    periodEnd,
    createdAt: i.createdAt ?? periodStart,
  };
}

// ── Auth ──────────────────────────────────────
export async function adminLogin(payload: AdminLoginRequest) {
  const { data } = await apiClient.post("/api/admin/v1/auth/login", payload);
  return data;
}

export async function adminVerifyOtp(
  payload: AdminVerifyOtpRequest,
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>(
    "/api/admin/v1/auth/verify-otp",
    payload,
  );
  return { ...data, user: normalizeUser(data.user) };
}

export async function adminLogout() {
  const { data } = await apiClient.post("/api/admin/v1/auth/logout");
  return data;
}

// Current authenticated user ("self"). The admin JWT only carries `sub`/`role`,
// so after a hard refresh the auth context calls this to recover the real
// firstName/lastName/email for display. Backend wraps it in ApiResponseUserDto;
// the response interceptor unwraps the envelope before we normalize.
export async function getCurrentUser(): Promise<UserDto> {
  const { data } = await apiClient.get<UserDto>("/api/v1/users/me");
  return normalizeUser(data);
}

// ── Venues ────────────────────────────────────
export async function getVenues(): Promise<VenueSummaryResponse[]> {
  const { data } = await apiClient.get<VenueSummaryResponse[]>(
    "/api/admin/v1/venues",
  );
  return (data ?? []).map(normalizeVenueSummary);
}

export async function getVenue(venueId: string): Promise<VenueDetailResponse> {
  const { data } = await apiClient.get<VenueDetailResponse>(
    `/api/admin/v1/venues/${venueId}`,
  );
  return normalizeVenueDetail(data);
}

export async function createVenue(
  payload: CreateVenueRequest,
): Promise<VenueDetailResponse> {
  // Endpoint is application/json. Trim optional string fields and drop empties
  // so we never send blank strings the backend would reject. Cover images are
  // not part of the JSON create DTO; they require a multipart upload flow.
  const trimmedDescription = payload.description?.trim();
  const trimmedContactPhone = payload.contactPhone?.trim();
  const trimmedContactEmail = payload.contactEmail?.trim();

  const body = {
    managerId: payload.managerId,
    nameEn: payload.nameEn.trim(),
    nameAr: payload.nameAr.trim(),
    // Compatibility mirror: also send a single `name` (English-primary) so the
    // backend accepts the create whether its DTO expects `nameEn`/`nameAr` or a
    // legacy single `name`. Harmless if the backend ignores unknown fields.
    name: payload.nameEn.trim(),
    addressLine: payload.addressLine.trim(),
    city: payload.city.trim(),
    timeZoneId: payload.timeZoneId,
    countryCode: payload.countryCode,
    latitude: payload.latitude,
    longitude: payload.longitude,
    currencyCode: payload.currencyCode,
    paymentMode: payload.paymentMode,
    courtLimit: payload.courtLimit,
    maxAdvanceBookingDays: payload.maxAdvanceBookingDays,
    allowRecurringBookings: payload.allowRecurringBookings,
    facilities: payload.facilities ?? [],
    ...(trimmedDescription ? { description: trimmedDescription } : {}),
    ...(trimmedContactPhone ? { contactPhone: trimmedContactPhone } : {}),
    ...(trimmedContactEmail ? { contactEmail: trimmedContactEmail } : {}),
    // Backend rejects an availability object with zero days; the caller already
    // omits `availability` in that case.
    ...(payload.availability ? { availability: payload.availability } : {}),
  };

  const { data } = await apiClient.post<VenueDetailResponse>(
    "/api/admin/v1/venues",
    body,
  );
  return normalizeVenueDetail(data);
}

// Editable view of a venue. The admin detail endpoint returns the full
// VenueResponse shape (including `availability`), so the edit form prefills
// from it directly.
export async function getEditableVenue(
  venueId: string,
): Promise<VenueResponse> {
  const { data } = await apiClient.get<VenueResponse>(
    `/api/admin/v1/venues/${venueId}`,
  );
  return {
    ...data,
    id: ensureStringId(data.id),
    name: displayName(data.nameEn, data.nameAr),
    managerId: data.managerId ? ensureStringId(data.managerId) : data.managerId,
  };
}

// PUT /api/admin/v1/venues/{venueId} (application/json).
export async function updateVenue(
  venueId: string,
  payload: UpdateVenueRequest,
): Promise<VenueResponse> {
  const body = {
    ...payload,
    // Compatibility mirror: when an English name is being sent, also send a
    // single `name` so the update works whether the backend DTO expects
    // `nameEn`/`nameAr` or a legacy single `name`.
    ...(payload.nameEn !== undefined ? { name: payload.nameEn } : {}),
  };
  const { data } = await apiClient.put<VenueResponse>(
    `/api/admin/v1/venues/${venueId}`,
    body,
  );
  return {
    ...data,
    id: ensureStringId(data.id),
    name: displayName(data.nameEn, data.nameAr),
  };
}

export async function setVenueStatus(
  venueId: string,
  payload: SetVenueStatusRequest,
) {
  const { data } = await apiClient.put(
    `/api/admin/v1/venues/${venueId}/status`,
    payload,
  );
  return data;
}

export async function assignManager(
  venueId: string,
  payload: AssignManagerRequest,
) {
  const { data } = await apiClient.post(
    `/api/admin/v1/venues/${venueId}/assign-manager`,
    payload,
  );
  return data;
}

// ── Users ─────────────────────────────────────
export async function createAdmin(
  payload: CreateAdminRequest,
): Promise<{ user: UserDto; message: string }> {
  const { data } = await apiClient.post<ApiEnvelope<UserDto>>(
    "/api/admin/v1/users/admin",
    payload,
    { preserveEnvelope: true },
  );
  return {
    user: normalizeUser(data.data),
    message: data.message ?? "Admin account created",
  };
}

export async function createVenueManager(
  payload: CreateVmUserRequest,
): Promise<UserDto> {
  const { data } = await apiClient.post<UserDto>(
    "/api/admin/v1/users/venue-manager",
    payload,
  );
  return normalizeUser(data);
}

// admin-user-controller: paginated venue-manager directory. Spring binds the
// flat `page`/`size`/`sort` query params from `Pageable`; `search` filters
// server-side. Returns a `PageResponse<UserDto>` (envelope auto-unwrapped).
export async function getVenueManagers(
  params: PageQuery = {},
): Promise<PageResponse<UserDto>> {
  const { data } = await apiClient.get<PageResponse<UserDto>>(
    "/api/admin/v1/users/venue-managers",
    { params },
  );
  return { ...data, content: (data?.content ?? []).map(normalizeUser) };
}

// admin-user-controller: paginated admin account directory.
export async function getAdmins(
  params: PageQuery = {},
): Promise<PageResponse<UserDto>> {
  const { data } = await apiClient.get<PageResponse<UserDto>>(
    "/api/admin/v1/users/admins",
    { params },
  );
  return { ...data, content: (data?.content ?? []).map(normalizeUser) };
}

// admin-user-controller: paginated customer (player) directory. Read-only —
// admins don't create or toggle customers, so there's no matching mutation.
export async function getCustomers(
  params: PageQuery = {},
): Promise<PageResponse<UserDto>> {
  const { data } = await apiClient.get<PageResponse<UserDto>>(
    "/api/admin/v1/users/customers",
    { params },
  );
  return { ...data, content: (data?.content ?? []).map(normalizeUser) };
}

export async function activateVenueManager(
  managerId: string,
): Promise<UserDto> {
  const { data } = await apiClient.put<UserDto>(
    `/api/admin/v1/users/venue-managers/${managerId}/activate`,
  );
  return normalizeUser(data);
}

export async function deactivateVenueManager(
  managerId: string,
): Promise<UserDto> {
  const { data } = await apiClient.put<UserDto>(
    `/api/admin/v1/users/venue-managers/${managerId}/deactivate`,
  );
  return normalizeUser(data);
}

// ── Invoices ─────────────────────────────────
export async function getInvoices(params?: {
  // Backend filters venue names separately by language. The admin search box is
  // English-primary, so callers pass `venueNameEn`; `venueNameAr` is available
  // for completeness. Both apply together when sent.
  venueNameEn?: string;
  venueNameAr?: string;
  status?: InvoiceStatus;
  page?: number;
  size?: number;
}): Promise<PageResponse<InvoiceResponse>> {
  const { data } = await apiClient.get<PageResponse<InvoiceResponse>>(
    "/api/admin/v1/invoices",
    { params },
  );
  return {
    ...data,
    content: (data?.content ?? []).map(normalizeInvoice),
  };
}

export async function getInvoicesByVenueManager(
  managerId: string,
  params?: {
    status?: InvoiceStatus;
    page?: number;
    size?: number;
  },
): Promise<PageResponse<InvoiceResponse>> {
  const { data } = await apiClient.get<PageResponse<InvoiceResponse>>(
    `/api/admin/v1/invoices/venue-managers/${managerId}`,
    { params },
  );
  return {
    ...data,
    content: (data?.content ?? []).map(normalizeInvoice),
  };
}

export async function getDuePayments(): Promise<DuePaymentsResponse> {
  const { data } = await apiClient.get<DuePaymentsResponse>(
    "/api/admin/v1/invoices/due-payments",
  );
  return {
    ...data,
    invoices: (data?.invoices ?? []).map(normalizeInvoice),
  };
}

export async function getInvoiceKpis(): Promise<InvoiceKpiSummary> {
  const { data } = await apiClient.get<InvoiceKpisResponse>(
    "/api/admin/v1/invoices/kpis",
  );
  return data.summary;
}

export async function getInvoice(id: string): Promise<InvoiceResponse> {
  const { data } = await apiClient.get<InvoiceResponse>(
    `/api/admin/v1/invoices/${id}`,
  );
  return normalizeInvoice(data);
}

export async function voidInvoice(id: string): Promise<InvoiceResponse> {
  const { data } = await apiClient.put<InvoiceResponse>(
    `/api/admin/v1/invoices/${id}/void`,
  );
  return normalizeInvoice(data);
}

export async function markInvoicePaid(
  id: string,
  payload: MarkPaidRequest,
): Promise<InvoiceResponse> {
  const { data } = await apiClient.put<InvoiceResponse>(
    `/api/admin/v1/invoices/${id}/mark-paid`,
    payload,
  );
  return normalizeInvoice(data);
}

// Bulk operations support partial success. We normalize the venue names on the
// returned (succeeded) invoices so the caller can render them consistently.
function normalizeBulkResult(result: BulkInvoiceResult): BulkInvoiceResult {
  return {
    succeeded: (result?.succeeded ?? []).map(normalizeInvoice),
    failed: result?.failed ?? [],
  };
}

export async function bulkMarkInvoicesPaid(
  ids: string[],
  paymentReference: string,
): Promise<BulkInvoiceResult> {
  const { data } = await apiClient.post<BulkInvoiceResult>(
    "/api/admin/v1/invoices/bulk-mark-paid",
    { ids, paymentReference },
  );
  return normalizeBulkResult(data);
}

export async function bulkVoidInvoices(
  ids: string[],
  reason?: string,
): Promise<BulkInvoiceResult> {
  const { data } = await apiClient.post<BulkInvoiceResult>(
    "/api/admin/v1/invoices/bulk-void",
    { ids, ...(reason ? { reason } : {}) },
  );
  return normalizeBulkResult(data);
}

export async function bulkRemindInvoices(
  ids: string[],
): Promise<BulkInvoiceResult> {
  const { data } = await apiClient.post<BulkInvoiceResult>(
    "/api/admin/v1/invoices/bulk-remind",
    { ids },
  );
  return normalizeBulkResult(data);
}

// Returns the backend-rendered invoice PDF as a Blob (raw application/pdf — NOT
// the JSON envelope, so we skip envelope unwrapping). The PDF uses the venue's
// EN/AR names.
export async function getInvoicePdf(id: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(
    `/api/admin/v1/invoices/${id}/pdf`,
    { responseType: "blob", preserveEnvelope: true },
  );
  return data;
}

// ── Contracts ────────────────────────────────
export async function getContracts(
  venueId: string,
): Promise<ContractResponse[]> {
  const { data } = await apiClient.get<ContractResponse[]>(
    `/api/admin/v1/venues/${venueId}/contracts`,
  );
  return data;
}

export async function getActiveContract(
  venueId: string,
): Promise<ContractResponse> {
  const { data } = await apiClient.get<ContractResponse>(
    `/api/admin/v1/venues/${venueId}/contracts/active`,
  );
  return data;
}

export async function createContract(
  venueId: string,
  payload: CreateContractRequest,
): Promise<ContractResponse> {
  const { data } = await apiClient.post<ContractResponse>(
    `/api/admin/v1/venues/${venueId}/contracts`,
    payload,
  );
  return data;
}
