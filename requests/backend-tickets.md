# Backend Tickets

**Audience:** Backend team
**Source:** Admin dashboard needs
**Status:** Draft

Use this file as the working queue for backend tickets that need to be created, clarified, or handed off.

## Invoice API Tickets

### Ticket 1: Suspend And Reactivate Venue Manager From Overdue Invoice

When an invoice is overdue, the admin invoices UI should offer an action to deactivate the related Venue Manager account and deactivate/suspend everything tied to that manager. Admins should also be able to reactivate the Venue Manager and restore the related entities once the issue is resolved.

**Suggested endpoints:**

```http
POST /api/admin/v1/invoices/{id}/suspend-venue-manager
POST /api/admin/v1/invoices/{id}/reactivate-venue-manager
```

Alternative if backend prefers manager-scoped operations:

```http
POST /api/admin/v1/venue-managers/{managerId}/suspend
POST /api/admin/v1/venue-managers/{managerId}/reactivate
```

If using manager-scoped endpoints, include the invoice context in the payload:

```json
{
  "invoiceId": 123,
  "reason": "Invoice overdue"
}
```

**Expected suspension behavior:**

- Allowed from an invoice only when the invoice status is `OVERDUE`.
- Suspends/deactivates the Venue Manager account so they can no longer sign in.
- Suspends/deactivates all venues assigned to that Venue Manager, or marks them unavailable for new bookings.
- Suspends/deactivates related courts or booking availability so customers cannot create new bookings for those venues.
- Existing data must not be deleted.
- Existing invoices, contracts, bookings, venues, and courts remain visible to admins for audit and recovery.
- Existing future bookings should either remain visible and untouched, or follow a documented cancellation/hold policy. Backend should confirm the intended behavior.

**Expected reactivation behavior:**

- Reactivates the Venue Manager account.
- Restores related venues, courts, and booking availability to their previous active states where possible.
- Does not blindly activate entities that were inactive before the suspension for unrelated reasons.
- Can be triggered after invoice payment or by explicit admin action.

**Suggested response:**

```ts
{
  invoice: InvoiceResponse
  venueManager: UserDto
  affectedVenueIds: number[]
  affectedCourtIds: number[]
  status: "SUSPENDED" | "REACTIVATED"
}
```

**Acceptance:**

- `/api/admin/**` requires ADMIN role.
- `404 "Invoice not found"` if invoice is missing.
- `409 "Invoice is not overdue"` if trying to suspend from a non-overdue invoice.
- Suspension is idempotent: suspending an already suspended manager returns the current suspended state without duplicating side effects.
- Reactivation is idempotent: reactivating an already active manager returns the current active state.
- Every suspend/reactivate action is audit-logged with admin ID, invoice ID, manager ID, affected entities, timestamp, and reason.
- Response uses global envelope `{ data, message, errors }`.

### Ticket 2: Admin Venue Invoice History Filters

For the admin dashboard invoices section, we need an admin-facing way to click a venue and show all invoice history for that venue, with filters for date and status.

Today there is no admin route like:

```http
GET /api/admin/v1/invoices?venueId=123&dateFrom=...&dateTo=...
GET /api/admin/v1/venues/{venueId}/invoices
GET /api/admin/v1/invoices/venues/{venueId}
```

The existing admin invoice list route is close:

```http
GET /api/admin/v1/invoices
```

It currently supports:

```ts
venueNameEn?: string
venueNameAr?: string
status?: "GENERATED" | "PAID" | "OVERDUE" | "VOID"
page?: number
size?: number
sort?: string
```

Admin can filter by venue name and status, but not by `venueId` and not by invoice dates.

There is also a VM-facing route:

```http
GET /api/vm/v1/invoices
```

It supports:

```ts
venueId: number
status?: string[]
paidAfter?: ISO datetime
paidBefore?: ISO datetime
page?: number
size?: number
sort?: string
```

But this route is not admin-facing and requires VM permissions for that venue. Also, its date filters only apply to `paidAt`, not `billingPeriodStart`, `billingPeriodEnd`, `dueDate`, or `createdAt`.

**Recommended backend change:**

Extend the existing admin invoice list route because the frontend already uses it:

```http
GET /api/admin/v1/invoices
```

Add support for:

```ts
venueId?: number
billingFrom?: ISO date
billingTo?: ISO date
dueFrom?: ISO date
dueTo?: ISO date
paidAfter?: ISO datetime
paidBefore?: ISO datetime
```

Example:

```http
GET /api/admin/v1/invoices?venueId=123&status=PAID&billingFrom=2026-01-01&billingTo=2026-06-30&page=0&size=20
```

Alternative route if backend prefers venue-scoped history:

```http
GET /api/admin/v1/invoices/venues/{venueId}
```

or:

```http
GET /api/admin/v1/venues/{venueId}/invoices
```

**Acceptance:**

- `/api/admin/v1/invoices` supports filtering by exact `venueId`.
- `/api/admin/v1/invoices` supports existing `status`, `page`, `size`, and `sort` params.
- `/api/admin/v1/invoices` supports billing-period date filters using `billingFrom` and `billingTo`.
- `/api/admin/v1/invoices` supports due-date filters using `dueFrom` and `dueTo`.
- `/api/admin/v1/invoices` supports paid-date filters using `paidAfter` and `paidBefore`.
- Admin can fetch a venue's full invoice history without depending on venue-name search.
- Admin can combine `venueId`, `status`, and date filters in the same request.
- Invalid `venueId`, `status`, or date params return `400` with a clear message.
- Response uses the same paginated invoice shape and global envelope as the existing admin invoice list endpoint.

### Ticket 3: Export All Invoices As Downloadable File

Single invoice PDF download already exists:

```http
GET /api/admin/v1/invoices/{id}/pdf
Authorization: Bearer <adminToken>
```

Expected single-invoice response:

```http
200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="invoice-{id}.pdf"
```

But there is currently no backend route for downloading or exporting all invoices, such as:

```http
GET /api/admin/v1/invoices/pdf
GET /api/admin/v1/invoices/export
GET /api/admin/v1/invoices/csv
GET /api/admin/v1/invoices/download
GET /api/admin/v1/invoices/bulk-pdf
```

The frontend can currently do client-side CSV export from fetched invoices, but backend does not provide an all-invoices file endpoint.

**Recommended endpoint:**

```http
GET /api/admin/v1/invoices/export?format=pdf&status=&venueId=&billingFrom=&billingTo=
```

The same endpoint could also support CSV:

```http
GET /api/admin/v1/invoices/export?format=csv&status=&venueId=&billingFrom=&billingTo=
```

Alternative route if backend prefers extension-style URLs:

```http
GET /api/admin/v1/invoices/export.pdf
GET /api/admin/v1/invoices/export.csv
```

**Suggested filters:**

```ts
format: "pdf" | "csv"
venueId?: number
status?: "GENERATED" | "PAID" | "OVERDUE" | "VOID"
billingFrom?: ISO date
billingTo?: ISO date
dueFrom?: ISO date
dueTo?: ISO date
paidAfter?: ISO datetime
paidBefore?: ISO datetime
```

**Expected PDF behavior:**

- Returns `application/pdf`.
- Uses `Content-Disposition: attachment; filename="invoices-{date}.pdf"`.
- Includes all invoices matching the filters, not only the current page.
- PDF should include invoice branding, invoice ID, venue, billing period, due date, status, amount due, payment reference, and paid date where available.
- Backend should decide whether this is a combined multi-invoice PDF report or a zip of individual invoice PDFs. Combined PDF report is preferred for the admin dashboard.

**Expected CSV behavior:**

- Returns `text/csv`.
- Uses `Content-Disposition: attachment; filename="invoices-{date}.csv"`.
- Includes all invoices matching the filters, not only the current page.
- Uses the same fields as the admin invoice list response.

**Acceptance:**

- `/api/admin/**` requires ADMIN role.
- Export supports the same invoice filters as the admin invoice list.
- Export is not limited by list pagination unless `page` and `size` are explicitly provided.
- Invalid `format`, `status`, `venueId`, or date params return `400` with a clear message.
- Empty result sets return a valid empty export file rather than `404`.
- Single invoice PDF route remains unchanged.
