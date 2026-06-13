import axios from "axios";
import { apiClient } from "./api-client";
import type {
  AdminLoginRequest,
  AdminVerifyOtpRequest,
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

interface ApiFieldError {
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

export function getApiErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (axios.isAxiosError(err)) {
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
    if (err.message && err.code !== "ERR_BAD_REQUEST") return err.message;
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

function normalizeUser(user: UserDto): UserDto {
  const now = new Date().toISOString();
  return {
    ...user,
    id: ensureStringId(user.id),
    createdAt: user.createdAt ?? now,
    updatedAt: user.updatedAt ?? now,
  };
}

function normalizeVenueSummary(v: VenueSummaryResponse): VenueSummaryResponse {
  return { ...v, id: ensureStringId(v.id) };
}

function normalizeVenueDetail(v: VenueDetailResponse): VenueDetailResponse {
  return {
    ...v,
    id: ensureStringId(v.id),
    managerId: v.managerId ? ensureStringId(v.managerId) : v.managerId,
    createdByAdminId: v.createdByAdminId
      ? ensureStringId(v.createdByAdminId)
      : v.createdByAdminId,
    courts: (v.courts ?? []).map((c) => ({ ...c, id: ensureStringId(c.id) })),
  };
}

function normalizeInvoice(i: InvoiceResponse): InvoiceResponse {
  const now = new Date().toISOString();
  const id = ensureStringId(i.id);
  const venueId = ensureStringId(i.venueId);
  const contractId = i.contractId ? ensureStringId(i.contractId) : i.contractId;
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
  // Endpoint is multipart/form-data (cover image is an uploaded file). Axios v1
  // detects the FormData body and sets the multipart Content-Type + boundary
  // itself, overriding the instance's default application/json.
  const fd = new FormData();
  fd.append("managerId", payload.managerId);
  fd.append("name", payload.name);
  if (payload.description) fd.append("description", payload.description);
  fd.append("addressLine", payload.addressLine);
  fd.append("city", payload.city);
  fd.append("countryCode", payload.countryCode);
  fd.append("latitude", String(payload.latitude));
  fd.append("longitude", String(payload.longitude));
  if (payload.contactPhone) fd.append("contactPhone", payload.contactPhone);
  if (payload.contactEmail) fd.append("contactEmail", payload.contactEmail);
  fd.append("currencyCode", payload.currencyCode);
  fd.append("paymentMode", payload.paymentMode);
  if (payload.allowRecurringBookings !== undefined) {
    fd.append("allowRecurringBookings", String(payload.allowRecurringBookings));
  }
  if (payload.maxAdvanceBookingDays !== undefined) {
    fd.append("maxAdvanceBookingDays", String(payload.maxAdvanceBookingDays));
  }
  for (const facility of payload.facilities ?? []) {
    fd.append("facilities", facility);
  }
  // Spring binds the nested AvailabilityScheduleRequest from indexed property
  // paths (availability.days[0].weekday=MONDAY), not a JSON blob.
  (payload.availability?.days ?? []).forEach((day, index) => {
    fd.append(`availability.days[${index}].weekday`, day.weekday);
    fd.append(
      `availability.days[${index}].openMinutes`,
      String(day.openMinutes),
    );
    fd.append(
      `availability.days[${index}].closeMinutes`,
      String(day.closeMinutes),
    );
  });
  if (payload.coverImage) fd.append("coverImage", payload.coverImage);

  const { data } = await apiClient.post<VenueDetailResponse>(
    "/api/admin/v1/venues",
    fd,
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
    managerId: data.managerId ? ensureStringId(data.managerId) : data.managerId,
  };
}

// PUT /api/admin/v1/venues/{venueId} (application/json).
export async function updateVenue(
  venueId: string,
  payload: UpdateVenueRequest,
): Promise<VenueResponse> {
  const { data } = await apiClient.put<VenueResponse>(
    `/api/admin/v1/venues/${venueId}`,
    payload,
  );
  return { ...data, id: ensureStringId(data.id) };
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
): Promise<UserDto> {
  const { data } = await apiClient.post<UserDto>(
    "/api/admin/v1/users/admin",
    payload,
  );
  return normalizeUser(data);
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
  venueName?: string;
  invoiceId?: string;
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
