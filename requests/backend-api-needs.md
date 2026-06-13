# Backend API Requests — Arena Admin Dashboard

**Audience:** Backend team (Spring Boot)
**Requested by:** Admin dashboard (Next.js)
**Last updated:** 2026-04-22

This document lists API capabilities the admin dashboard needs but cannot build today because the data is not exposed. Items are grouped by **priority** and include proposed endpoints, request/response shapes (matching existing `src/types/api.ts` style), and which dashboard widgets unlock when the work lands.

> **How we're filling the gap today:** Every endpoint below has a matching mock file in `src/lib/mock-*.ts` that returns plausible data so the UI renders. Each mock file has a `USE_MOCK_*_FALLBACK` flag — flip it to `false` once the real endpoint ships and the mock falls away automatically.
>
> Current mocks in place:
>
> - `src/lib/mock-venues.ts` → #3 venue enrichment fields
> - `src/lib/mock-invoices.ts` → invoice listing + bulk ops
> - `src/lib/mock-users.ts` → #11 user directory listing
> - `src/lib/mock-notifications.ts` → #12 notification feed
> - `src/lib/analytics-api.ts` → #1 bookings, #2 utilization, #4 analytics, #9 heatmap

---

## Priority legend

| Priority | Meaning                                                                     |
| -------- | --------------------------------------------------------------------------- |
| **P0**   | Unblocks core analytics admins ask for daily. Implement first.              |
| **P1**   | Important but the dashboard still functions without it. Implement after P0. |
| **P2**   | Nice-to-have / advanced. Implement once P0 + P1 are in production.          |

---

## P0 — Core analytics gaps (blocking)

### 1. Bookings domain (completely missing)

**Problem:** We have invoices but no bookings. Today we use invoice count as a booking proxy, which is wrong — one invoice can cover many bookings. Every "bookings" widget on the dashboard, venue detail, and analytics pages depends on this.

**Proposed endpoints:**

```
GET /api/admin/v1/bookings
GET /api/admin/v1/bookings/{id}
GET /api/admin/v1/bookings/stats
```

**Suggested TypeScript types (for reference — backend uses DTOs):**

```ts
export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "NO_SHOW"
  | "COMPLETED";

export interface BookingResponse {
  id: string;
  venueId: string;
  venueName: string;
  courtId: string;
  courtName: string;
  customerId: string;
  customerName: string;
  sport: string;
  slotStart: string; // ISO 8601
  slotEnd: string;
  price: number;
  currencyCode: string;
  status: BookingStatus;
  cancellationReason?: string;
  leadTimeHours: number; // createdAt → slotStart
  createdAt: string;
  updatedAt: string;
}

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
```

**Query params expected on the list endpoint:**

- `venueId` (optional) — filter by venue
- `status` (optional) — filter by status
- `from` / `to` (optional, ISO dates) — date range
- `sport` (optional)
- `page`, `size`, `sort` — standard pagination

**Unlocks on the dashboard:**

- Real **Bookings KPI** (currently shows invoice count as a proxy)
- Real **Top venues by booking volume** (we currently sort by revenue as the best proxy)
- **Cancellation rate** KPI in the secondary stats strip
- **No-show rate** KPI
- Bookings trend chart driven by real data (currently a static reference curve)

---

### 2. Venue utilization

**Problem:** We currently show synthetic utilization % in the top-venues panel because there is no endpoint that tells us "of the bookable hours this week/month, how many were booked?" This is the #1 KPI for a venue-booking platform.

**Proposed endpoint:**

```
GET /api/admin/v1/venues/{venueId}/utilization?from=...&to=...
GET /api/admin/v1/venues/utilization?from=...&to=...  (batch for all venues)
```

**Response:**

```ts
export interface VenueUtilizationResponse {
  venueId: string;
  venueName: string;
  periodStart: string;
  periodEnd: string;
  availableHours: number; // derived from opening hours × courts
  bookedHours: number;
  utilizationPercent: number; // bookedHours / availableHours × 100
  peakDayOfWeek?: number; // 0 = Sunday
  peakHourOfDay?: number; // 0-23
}
```

**Unlocks:**

- Real venue utilization meters (currently synthetic 92/87/81/… grades)
- "Under-utilized venues" alert list on the dashboard
- Per-venue utilization tile on the venue detail page

---

### 3. Venue enrichment fields

**Problem:** `VenueSummaryResponse` is missing fields the dashboard wants to surface and group by.

**Fields to add to `VenueSummaryResponse`:**

| Field                 | Type                 | Why                                                                  |
| --------------------- | -------------------- | -------------------------------------------------------------------- |
| `sports`              | `string[]`           | Group revenue/bookings by sport. Powers the current pill filter row. |
| `courtCount`          | `number`             | Shown on venue cards; needed for utilization baseline.               |
| `openingHours`        | `Record<Day, Hours>` | Needed to compute `availableHours` for utilization.                  |
| `primaryManagerId`    | `string \| null`     | Link directly to the VM from the venue row.                          |
| `primaryManagerName`  | `string \| null`     | Display without a second API call.                                   |
| `activeBookingsCount` | `number`             | Quick "what's booked right now?" indicator.                          |

**Unlocks:**

- Pill filter row on the revenue spectrum actually filters (currently decorative)
- "Sports mix" pie/spectrum widget
- Manager column on the venues list
- Real-time "in-progress bookings" count

---

## P1 — High-value analytics

### 4. Aggregated analytics endpoint

**Problem:** The dashboard computes revenue aggregations, collection rate, MoM delta, etc. client-side by fetching every invoice. This will not scale past a few hundred venues.

**Proposed endpoint:**

```
GET /api/admin/v1/analytics/overview?period=mtd|last30d|ytd
```

**Response (single call replacing ~5 client-side computations):**

```ts
export interface AnalyticsOverviewResponse {
  period: "mtd" | "last30d" | "ytd";
  totalRevenue: number;
  currencyCode: string;
  revenueMoMDelta: number; // percent
  collectionRate: number; // percent
  totalBookings: number;
  bookingsMoMDelta: number;
  avgInvoiceAmount: number;
  p50DaysToPay: number;
  activeVenues: number;
  totalVenues: number;
  newVenuesThisMonth: number;
  overdueInvoiceCount: number;
  upcomingDueCount: number;
  upcomingDueAmount: number;
}
```

**Also:**

```
GET /api/admin/v1/analytics/revenue?groupBy=city|venue|sport|day|week|month&from=...&to=...
```

```ts
export interface RevenueBucket {
  bucket: string; // "Dubai" or "2026-04" or "football"
  revenue: number;
  bookingCount: number;
  invoiceCount: number;
}
export type RevenueGroupedResponse = RevenueBucket[];
```

**Unlocks:**

- Dashboard first paint: 1 request instead of 2 (invoices list + venues list both get replaced)
- Bookings trend chart with real data for any time range the user picks
- Revenue-by-sport spectrum (currently blocked by missing `sport` field)

---

### 5. Customer domain

**Problem:** The dashboard has no way to answer "who are our customers?" — repeat rate, LTV, churn, VIPs. These are normal questions for any platform business.

**Proposed endpoints:**

```
GET /api/admin/v1/customers
GET /api/admin/v1/customers/{id}
GET /api/admin/v1/customers/stats
```

**Types:**

```ts
export interface CustomerResponse {
  id: string;
  name: string;
  email: string;
  phone?: string;
  totalBookings: number;
  totalSpent: number;
  currencyCode: string;
  firstBookingAt: string;
  lastBookingAt: string;
  favoriteSport?: string;
  favoriteVenueId?: string;
  status: "ACTIVE" | "DORMANT";
}

export interface CustomerStatsResponse {
  totalCustomers: number;
  newThisMonth: number;
  repeatBookingRate: number; // customers with 2+ bookings / total
  avgLifetimeValue: number;
  top10ByRevenue: CustomerResponse[];
}
```

**Unlocks:**

- "New customers this month" KPI
- "Top customers" widget (VIPs admins want to know)
- Customer retention tile
- Dedicated `/dashboard/customers` page

---

### 6. Manager activity

**Problem:** `UserDto` (for VMs) is missing behavioral signals admins want to see at a glance.

**Fields to add to `UserDto` (when role = VENUE_MANAGER):**

| Field                      | Type       | Why                                                              |
| -------------------------- | ---------- | ---------------------------------------------------------------- |
| `lastLoginAt`              | `string`   | "Who hasn't logged in in 14 days?"                               |
| `bookingsHandledThisMonth` | `number`   | Performance signal                                               |
| `assignedVenueIds`         | `string[]` | Show a manager's full portfolio without a second call            |
| `responseTimeP50Minutes`   | `number`   | If VMs confirm bookings, how fast? (Skip if not applicable yet.) |

**Unlocks:**

- Manager leaderboard on `/dashboard/users`
- "Dormant manager" alerts
- Manager detail page with activity timeline

---

## P2 — Advanced / nice-to-have

### 7. Alerts / anomaly feed

**Problem:** Admins currently have no way to be notified of anomalies (revenue drop, contract expiring, VM inactivity). They have to notice manually.

**Proposed endpoint:**

```
GET  /api/admin/v1/alerts?status=unacknowledged
POST /api/admin/v1/alerts/{id}/acknowledge
```

**Type:**

```ts
export type AlertType =
  | "REVENUE_DROP"
  | "CONTRACT_EXPIRING"
  | "LATE_PAYMENT"
  | "LOW_UTILIZATION"
  | "MANAGER_INACTIVE"
  | "COMPLAINT_SPIKE";

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface AlertResponse {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  venueId?: string;
  userId?: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}
```

**Unlocks:**

- Notification dot on topbar becomes real (currently decorative)
- "What needs my attention today?" card on dashboard
- Slack/email digest opportunity

---

### 8. Forecasting

**Problem:** Admins ask "are we going to hit our revenue target this month?" The answer is computable from run-rate + historical weekly seasonality.

**Proposed endpoint:**

```
GET /api/admin/v1/analytics/forecast?horizon=eom|week|quarter
```

**Response:**

```ts
export interface ForecastResponse {
  horizon: "eom" | "week" | "quarter";
  projectedRevenue: number;
  currencyCode: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  daysRemaining: number;
  basedOnBookings: number; // sample size
  upperBound: number;
  lowerBound: number;
}
```

**Unlocks:**

- Hero KPI gets a forecast ghost-line alongside the sparkline
- "Projected EOM: USD X (±Y)" tile

---

### 9. Peak-hours heatmap

**Problem:** Operations want to know "when do people book?" to plan staffing, pricing, and capacity.

**Proposed endpoint:**

```
GET /api/admin/v1/analytics/heatmap?from=...&to=...&venueId=...
```

**Response:**

```ts
export interface HeatmapCell {
  dayOfWeek: number; // 0-6
  hourOfDay: number; // 0-23
  bookingCount: number;
  revenue: number;
}
export type HeatmapResponse = HeatmapCell[];
```

**Unlocks:**

- 7×24 heatmap widget on dashboard and venue detail
- Peak-pricing suggestions
- Capacity-planning view

---

### 10. Contract lifecycle signals

**Problem:** Contracts (`ContractResponse`) exist but the dashboard has no way to show "contracts expiring in 30 days" or "churn risk".

**Fields to add / endpoint:**

```
GET /api/admin/v1/contracts/expiring?days=30
```

or add `daysUntilExpiry` + `renewalStatus` to the existing `ContractResponse`.

**Unlocks:**

- "Contracts renewing this month" alert
- Venue churn risk indicator

---

### 11. User directory listing + lifecycle (NEW)

**Problem:** The dashboard has `POST /admin/v1/users/admin` and `POST /admin/v1/users/venue-manager` to create users, but no way to **list** them. The entire `/dashboard/users` page (directory view) runs on `MOCK_USERS`.

**Proposed endpoints:**

```
GET    /api/admin/v1/users?role=ADMIN|VENUE_MANAGER&status=ACTIVE|PENDING|DISABLED&q=...&page=...&size=...
GET    /api/admin/v1/users/{id}
PATCH  /api/admin/v1/users/{id}                 # update name/phone (admin-only)
POST   /api/admin/v1/users/{id}/disable
POST   /api/admin/v1/users/{id}/enable
DELETE /api/admin/v1/users/{id}                  # soft-delete, audit-logged
POST   /api/admin/v1/users/{id}/resend-credentials
```

**Fields to add to `UserDto`:**

| Field              | Type                | Why                                                                |
| ------------------ | ------------------- | ------------------------------------------------------------------ |
| `assignedVenueIds` | `string[]`          | Venue Managers: which venues they manage. Drives the venue stack.  |
| `lastActiveAt`     | `string` (nullable) | "Who hasn't logged in recently?" (Overlaps with #6 `lastLoginAt`.) |

**Query params on list:**

- `role` — filter by role (ADMIN / VENUE_MANAGER)
- `status` — filter by status bucket (ACTIVE / PENDING / DISABLED); `PENDING` matches any `PENDING_*` enum
- `q` — free-text search across name, email, and assigned-venue names
- `page`, `size`, `sort` — standard pagination

**Response shape:** `PageResponse<UserDto>` (see Cross-cutting below).

**Bulk operations** (users page has the UI already stubbed):

```
POST /api/admin/v1/users/bulk-disable    { ids: string[] }
POST /api/admin/v1/users/bulk-delete     { ids: string[] }
```

**Unlocks:**

- Entire `/dashboard/users` directory page with real data
- Filter chips (All / Admins / Managers / Pending / Disabled) with accurate counts
- Venue-avatar stack showing which venues a manager owns
- "Last active" column for dormancy signal
- Bulk-action bar (Export / Disable / Delete)
- Edit + Disable + Delete actions per row
- Resend credentials action for pending users

---

### 12. Notification feed (NEW)

**Problem:** The topbar bell icon opens a notifications popover driven entirely by `MOCK_NOTIFICATIONS`. This is distinct from #7 (Alerts) which is **operational anomalies**; this one is **user-facing events** (deep-linked to an invoice, venue, user, or session).

**Proposed endpoints:**

```
GET   /api/admin/v1/notifications?onlyUnread=false&limit=50
POST  /api/admin/v1/notifications/{id}/read
POST  /api/admin/v1/notifications/mark-all-read
GET   /api/admin/v1/notifications/unread-count
```

**Type:**

```ts
export type NotificationType =
  | "invoice_overdue"
  | "invoice_paid"
  | "venue_new"
  | "user_new"
  | "session_new"
  | "system";

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  /** Optional deep link — dashboard will route on click. */
  link?: string;
  /** Which entity this refers to, if any. */
  venueId?: string;
  invoiceId?: string;
  userId?: string;
}
```

**Real-time delivery (optional follow-up):**

- WebSocket or SSE at `/api/admin/v1/notifications/stream` so the unread badge updates live.
- Server push when an event is generated server-side (e.g., invoice tipped into overdue).

**Relationship to #7 Alerts:** Alerts are admin-scoped anomalies with acknowledge semantics; notifications are per-user events. Alerts _could_ generate notifications on creation, but the two APIs stay separate.

**Unlocks:**

- Topbar bell pulse + unread count reflect real events
- Deep-linked notification rows navigate to the relevant page
- Mark-all-read action actually persists
- Weekly digest emails can reuse the same feed

---

### 13. Per-invoice PDF (NEW)

**Problem:** The invoices table has a "Download PDF" button per row, but there is no endpoint to fetch a single invoice as a PDF. The dashboard currently calls the client-side `downloadPDF()` utility (which renders a one-row table) as a stop-gap.

**Proposed endpoint:**

```
GET /api/admin/v1/invoices/{id}/pdf   → application/pdf
```

Server-side rendering gives us proper branding, totals, line items, and the venue contract terms — none of which are available client-side. Supports HEAD for Content-Length / caching.

**Unlocks:**

- Row-level "Download PDF" returns a finished invoice (currently a stop-gap)
- Email attachments when reminders ship (bulk op below)
- Printable copies for venues that need physical records

---

### 14. Bulk invoice operations (NEW)

**Problem:** The invoices bulk-selection bar has buttons for **Mark paid**, **Remind**, **Void**, and **Export**. Today only Export works (client-side CSV). The other three toast "coming soon".

**Proposed endpoints:**

```
POST /api/admin/v1/invoices/bulk-mark-paid   { ids: string[], paymentReference?: string }
POST /api/admin/v1/invoices/bulk-void        { ids: string[], reason?: string }
POST /api/admin/v1/invoices/bulk-remind      { ids: string[] }
```

**Notes:**

- Bulk remind should send an email per venue manager referencing only their invoices (not a combined email across multiple venues).
- Bulk mark-paid should accept an optional payment reference applied to all; alternatively return 409 if different references are required per invoice.
- Return a `BulkResponse<InvoiceResponse>` with per-id success/failure so the UI can surface partial failures.

```ts
export interface BulkResponse<T> {
  succeeded: T[];
  failed: Array<{ id: string; reason: string }>;
}
```

**Unlocks:**

- The existing bulk-action bar (already visible when rows are checked) becomes fully functional
- Collections workflow (select all overdue → Remind) becomes one-click

---

### 15. Session management (NEW)

**Problem:** The Settings → Security section lists "Chrome on macOS" and "Safari on iPhone" as active sessions, with a "Sign out" button per session and a "Sign out everywhere" button. All driven by mock state today.

**Proposed endpoints:**

```
GET    /api/admin/v1/auth/sessions           # current user's active sessions
DELETE /api/admin/v1/auth/sessions/{id}       # revoke a specific session
POST   /api/admin/v1/auth/sessions/revoke-all # sign-out-everywhere (except current)
```

**Type:**

```ts
export interface SessionResponse {
  id: string;
  device: string; // "Chrome on macOS" (parsed from UA)
  ipAddress: string;
  location?: string; // "Dubai, AE" (from IP)
  lastActiveAt: string;
  createdAt: string;
  current: boolean; // true for the session making the request
}
```

**Security notes:**

- Revoking a session should invalidate its refresh token immediately
- `revoke-all` should force re-authentication on every device except the caller's
- Rate-limit session list to prevent enumeration

**Unlocks:**

- Settings → Security → Active sessions becomes real
- "Sign out everywhere" in Danger zone becomes functional
- Compliance story: admins can see and control their active sessions

---

### 16. User preferences (NEW)

**Problem:** Settings page has toggles for:

- **Security**: 2FA on/off, sign-in alerts on/off
- **Notifications**: 6 category toggles (overdue, new venue, manager digest, unusual sign-in, new admin, product updates) × 2 channels (email, in-app)
- **Appearance**: theme (dark/light/system), density (compact/comfortable/spacious)

All changes are local state — nothing persists across sessions.

**Proposed endpoints:**

```
GET   /api/admin/v1/users/me/preferences
PATCH /api/admin/v1/users/me/preferences
```

**Type:**

```ts
export interface UserPreferences {
  security: {
    twoFactorEnabled: boolean;
    signInAlertsEnabled: boolean;
  };
  notifications: {
    // Keyed by NotificationType (see #12). Each slot has per-channel toggles.
    email: Record<string, boolean>;
    inApp: Record<string, boolean>;
  };
  appearance: {
    theme: "dark" | "light" | "system";
    density: "compact" | "comfortable" | "spacious";
  };
}
```

**2FA specifically** (separate flow, not just a boolean):

```
POST /api/admin/v1/auth/2fa/enroll        → { otpauthUri, qrSvg, recoveryCodes[] }
POST /api/admin/v1/auth/2fa/verify         { code: string } → enables 2FA
POST /api/admin/v1/auth/2fa/disable        { code: string }
POST /api/admin/v1/auth/2fa/regenerate-codes
```

**Unlocks:**

- Settings preferences actually persist
- Notification feed (#12) honours per-user channel preferences
- Theme/density preference survives refresh
- 2FA as a first-class security feature

---

### 17. Admin API keys (NEW, P2)

**Problem:** Settings → Platform → API Keys currently shows a "Coming soon" table with one illustrative row. Admins want personal API tokens for scripting / integrations (read-only exports, cron jobs pulling reports).

**Proposed endpoints:**

```
GET    /api/admin/v1/users/me/api-keys
POST   /api/admin/v1/users/me/api-keys         { name: string, scope?: string[] }
POST   /api/admin/v1/users/me/api-keys/{id}/rotate
DELETE /api/admin/v1/users/me/api-keys/{id}
```

**Type:**

```ts
export type ApiKeyScope =
  | "read:all"
  | "read:venues"
  | "read:invoices"
  | "write:venues";

export interface ApiKeyResponse {
  id: string;
  name: string;
  prefix: string; // "sk_live_abcd" (first 8 chars shown in UI)
  scopes: ApiKeyScope[];
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  revoked: boolean;
}

export interface ApiKeyCreatedResponse extends ApiKeyResponse {
  /** Full secret — returned ONLY on create/rotate. Not stored server-side. */
  secret: string;
}
```

**Security notes:**

- Secret must be shown to the user **once** on create/rotate, never again
- Server stores only a hash of the secret
- Scoped to admin users; never exposed to venue managers
- Audit-log every key lifecycle event

**Unlocks:**

- Settings → API Keys section becomes functional
- Enables admin scripting / integrations / third-party reporting tools

---

### 18. Self-profile update (NEW, P2)

**Problem:** The Settings → Profile section shows read-only identity (name, email, role) with a blue hint: "Identity is managed centrally by platform admins". This is deliberate for audit reasons, but admins should at least be able to update their own display name.

**Proposed endpoint:**

```
PATCH /api/admin/v1/users/me          { firstName?, lastName?, phoneNumber? }
```

Excludes email and role (those require another admin's approval). Every change should be audit-logged with old/new values.

**Unlocks:**

- Removes the "contact another admin to change your name" friction
- Keeps email + role change gated behind admin approval

---

## Cross-cutting improvements

### Pagination consistency

Every list endpoint should return `PageResponse<T>`:

```ts
interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
}
```

Today `getInvoices({ size: 100 })` returns this shape but not all list endpoints do. Making it uniform unblocks infinite scroll, proper "Showing X of Y" copy, and export-all buttons.

### Currency handling

All monetary fields should include `currencyCode` alongside the amount. The dashboard currently hardcodes `USD` because we cannot trust mixed-currency aggregation. If Arena will support multiple currencies, we need either:

- A tenant-level `displayCurrency` setting with server-side FX conversion, or
- An explicit "this aggregation is in X currency, excluding N invoices in other currencies" response envelope.

### Timestamps

All timestamps should be ISO 8601 UTC (`2026-04-19T12:30:45Z`). Mixed formats (date-only vs. datetime, local vs. UTC) cause off-by-one bugs in the MoM delta computation.

---

## Summary table — effort vs. unlock

| #   | Request                     | Priority | Est. backend effort     | Mock file                       | Unlocks                                   |
| --- | --------------------------- | -------- | ----------------------- | ------------------------------- | ----------------------------------------- |
| 1   | Bookings domain             | P0       | L                       | `analytics-api.ts`              | 5+ widgets                                |
| 2   | Venue utilization           | P0       | M                       | `analytics-api.ts`              | 3 widgets                                 |
| 3   | Venue enrichment fields     | P0       | S                       | `mock-venues.ts` (`courtCount`) | 3 widgets + venues table column           |
| 11  | **User directory listing**  | **P0**   | **M**                   | **`mock-users.ts`**             | **Entire `/dashboard/users` page**        |
| 4   | Analytics overview endpoint | P1       | M                       | —                               | All KPI cards (optimization)              |
| 5   | Customer domain             | P1       | L                       | —                               | Entire customers page                     |
| 6   | Manager activity fields     | P1       | S                       | `mock-users.ts`                 | 2 widgets                                 |
| 12  | **Notification feed**       | **P1**   | **M**                   | **`mock-notifications.ts`**     | **Topbar bell + notification popover**    |
| 13  | **Per-invoice PDF**         | **P1**   | **S**                   | — (client-side stub)            | **Row-level PDF download**                |
| 14  | **Bulk invoice operations** | **P1**   | **S**                   | — (client-side stub)            | **Bulk bar actions (mark paid / remind)** |
| 15  | **Session management**      | **P1**   | **S**                   | — (hardcoded in settings)       | **Settings → Security → sessions**        |
| 16  | **User preferences + 2FA**  | **P1**   | **M**                   | — (local state)                 | **Settings toggles persist**              |
| 7   | Alerts feed                 | P2       | M                       | —                               | 2 widgets                                 |
| 8   | Forecasting                 | P2       | M                       | —                               | 1 widget                                  |
| 9   | Peak-hours heatmap          | P2       | S (once bookings exist) | `analytics-api.ts`              | 1 widget                                  |
| 10  | Contract lifecycle          | P2       | S                       | —                               | 1 widget                                  |
| 17  | **Admin API keys**          | **P2**   | **M**                   | — (UI says "Coming soon")       | **Settings → API keys section**           |
| 18  | **Self-profile update**     | **P2**   | **S**                   | —                               | **Edit own name / phone**                 |

**Recommendation:** Start with **#1 (Bookings), #2 (Utilization), #3 (Venue enrichment), #11 (User listing)** as one coordinated release. Together they unlock more than half the widgets on the admin dashboard and remove all synthetic/proxy data currently shown. #11 is listed P0 because the entire users directory is mock-driven today — the UI is ready but empty without a backend.

**Second wave (P1):** #12 (Notifications) + #13 (PDF) + #14 (Bulk ops) + #15 (Sessions) + #16 (Preferences) — all connect UI that's already built but currently running on local state.

---

## Contact

Dashboard owner: Ali Al Yaman
Questions / clarifications: reply in this file or ping on Slack.
