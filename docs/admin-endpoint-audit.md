# Admin endpoint integration audit

Audited 2026-09-13 against this dashboard and the authoritative sibling backend
at `products/SRC-mobile-app/scrMobileApp` (controllers, DTOs, controller tests,
and Postman collection). The configured API points at `localhost:8081`; live
schema URLs were unavailable because the backend was not running.

`Yes (P1/P2)` means the exact method/path is connected to visible UI by that phase.
`Related only` means the dashboard has an aggregate model or adjacent workflow,
not that the listed endpoint is currently called.

## Completion status

The table below preserves the preimplementation findings and questions that
guided the work. The authoritative backend controllers and DTOs subsequently
resolved the Phase 3 and Phase 4 contracts. These routes are now connected:

| Domain | Connected granular operations | Visible surface and consistency rule |
|---|---|---|
| Layout | `GET/PUT .../layout` | Court detail layout selector and returned area list. Uses backend values `FULL_ONLY`, `HALVES`, and `HALVES_ONLY`; the legacy aggregate layout control was removed. |
| Rules | `GET/POST .../rules`, `DELETE .../rules/{ruleId}` | Court detail rule list, validated add form, stable-ID confirmation and local refresh. |
| Sports | `GET/POST .../sports`, `PUT/DELETE .../sports/{courtSportId}` | Independently editable sport rows. Deletion warns that pricing and equipment are deactivated. Aggregate sports editing was removed. |
| Equipment | `GET/POST .../equipment`, `PUT/DELETE .../equipment/{equipmentId}` | Nested under each sport with localized names, stock, reservation limit, tier prices, pending states and confirmation. Existing tiers are preserved during focused stock/limit updates. |
| Pricing | `GET/POST .../pricing`, `POST .../pricing/base`, `PUT/DELETE .../pricing/{ruleId}`, `PUT/DELETE .../pricing/groups/{groupId}` | Nested base/special pricing, monetary and time validation, stable rule/group IDs, and dedicated group mutations. |
| Discounts | `GET/POST .../discounts`, `PUT/DELETE .../discounts/{discountId}` | Venue detail list plus create/edit/delete workflow with kind-specific value, validity window, court eligibility and status. |
| Redemptions | `GET .../promotions/{promotionId}/redemptions` | Promotion rows link to a paginated history table with reservation, player, amount, state and timestamps. The admin promotion list route is read as the required parent resource. |

All granular mutations refresh only their affected local resource. The full
court record is refreshed after layout/sport mutations, and granular controls
are disabled while the aggregate details form is dirty to prevent stale
replacement saves.

| Endpoint | Used? | Existing wrapper or related implementation | Dashboard location | UI interaction | Request / response contract | Dependency or unresolved question |
|---|---:|---|---|---|---|---|
| `POST /store-analytics/imports/{platform}/run` | Yes (P1) | `getStoreImportStatus`; store analytics reports | Store Analytics | Platform-scoped confirmation, pending/error/success, status refresh | Path `StorePlatform`; no body; response intentionally unused | Whether acceptance is synchronous or queued is not documented |
| `DELETE /users/venue-managers/{managerId}/staff/{staffUserId}` | Yes (P1) | Staff directory + update wrapper | Manager staff directory | Named destructive confirmation; row removed after success | Path IDs; no body; response unused | Whether deleting the last assignment deletes or detaches the account is not documented |
| `PUT /users/{userId}/block` | Yes (P2) | `AdminUserController`; customer directory | Player row actions | Explicit one-way block confirmation | No body; `ApiResponse<UserDto>` | Customer-only; revokes sessions and cancels active upcoming bookings; no admin unblock route exists |
| `GET /venues/{venueId}/availability` | Yes (P2) | `AdminAvailabilityController` and response DTO | Venue detail / Availability | Weekly schedule, timezone, retry | Direct `AvailabilityScheduleResponse` with days, rules, inheritance, mode | Venue schedule is intentionally read-only because no admin venue-availability mutation route was supplied |
| `GET /venues/{venueId}/blackout-dates` | Yes (P2) | Admin availability controller/DTO | Venue detail / Blackout dates | List with loading, empty, error and retry states | Direct `BlackoutResponse[]` | Court-area rows can be displayed but cannot be created until the dashboard venue data exposes area IDs |
| `POST /venues/{venueId}/blackout-dates/check` | Yes (P2) | `CreateBlackoutRequest`, `BlackoutImpactResponse` | Blackout creation dialog | Exact-payload impact review | Date required; optional court/area, paired local times, reason; overlap count response | Check does not return a token; UI freezes the reviewed request before confirmation |
| `POST /venues/{venueId}/blackout-dates/confirm` | Yes (P2) | Admin availability controller/DTO | Blackout creation dialog | Explicit confirm after check | Same request; returns blackout plus cancelled count | Backend is source of truth for cancellation side effects |
| `DELETE /venues/{venueId}/blackout-dates/{blackoutId}` | Yes (P2) | Admin availability controller | Blackout row action | Destructive confirmation | No body; 204 response | Cancelled bookings are not restored by deleting a blackout |
| `PUT /venues/{venueId}/contracts/{contractId}` | Yes (P1) | Contract list, active contract, create DTO/editor | Venue detail / Contract Terms | Update active contract; create remains distinct; refresh active + history | `CreateContractRequest` fields and `ContractResponse` are established by existing contract API | Whether optimistic concurrency/version is supported is not documented |
| `PUT /venues/{venueId}/court-limit` | Yes (P2) | `AdminVenueController`; venue DTO | Venue detail / Venue configuration | Numeric setting with current-count guard | `{ courtLimit: integer >= 1 }`; returns venue | Backend rejects a limit below the existing court count |
| `DELETE /venues/{venueId}/courts/{courtId}` | Yes (P1) | Court detail and venue court list | Court detail / Danger zone | Exact-name confirmation; conflict preserved; return to venue | Path IDs; no body; response unused | Exact conflict codes beyond HTTP 409 are not documented |
| `GET /venues/{venueId}/courts/{courtId}/availability` | Yes (P2) | `AdminAvailabilityController`; schedule DTOs | Court detail / Availability | Inheritance vs custom-hours view | Direct schedule with normalized days/rules/mode | Backend uses venue-local minutes and supports venue inheritance |
| `PUT /venues/{venueId}/courts/{courtId}/availability` | Yes (P2) | Dedicated wrapper plus existing weekly editor | Court detail / Availability | Dedicated validated save | `{ scheduleMode, days[] }`; returns schedule | `days` remains required for venue mode, so venue days are sent; aggregate state is refreshed after save |
| `PUT /venues/{venueId}/courts/{courtId}/cancellation-policy` | No | Controller proves `{ policyId }`; aggregate record carries the ID | Court configuration | Structured policy selector | `{ policyId: Long }`; returns court | No admin-accessible policy-list endpoint was supplied, so a safe structured selector cannot be populated; the existing assignment is read-only rather than exposed as a raw-ID editor |
| `GET /venues/{venueId}/courts/{courtId}/conflicts` | Yes (P2) | `AdminCourtConflictController` | Court Availability | Local datetime window check and booking IDs | Required ISO local `startTime`/`endTime`; conflict flag and booking IDs | Current booking page is linked; no single-booking admin route is established |
| `GET /venues/{venueId}/courts/{courtId}/layout` | No | `CourtDivisionLayout` exists in aggregate record | Court detail / Layout | Read-only until full schema known | **Unknown response beyond possible enum** | Route may include dimensions/areas, not just `divisionLayout` |
| `PUT /venues/{venueId}/courts/{courtId}/layout` | No | Aggregate editor saves `divisionLayout` | Court detail / Layout | Dedicated save when proven | **Unknown request/response** | Mutation schema and impact/conflict semantics required |
| `GET /venues/{venueId}/courts/{courtId}/rules` | No | Aggregate `CourtRuleRecord` | Court detail / Rules | Loading/error/list/empty state | Candidate type exists; exact response not proven | Confirm whether description is required and IDs are numeric |
| `POST /venues/{venueId}/courts/{courtId}/rules` | No | Aggregate `CourtRuleRecord` | Court detail / Rules | Add rule form | **Unknown create request/response** | Server ID/version response and validation limits required |
| `DELETE /venues/{venueId}/courts/{courtId}/rules/{ruleId}` | No | Aggregate rule IDs are optional | Court detail / Rules | Named confirmation | Path IDs known; success/error unknown | Stable ID type and dependency behavior required |
| `GET /venues/{venueId}/courts/{courtId}/sports` | No | Aggregate `CourtRecordSport[]` | Court detail / Sports | Sectioned list | Candidate aggregate type exists; exact response not proven | Whether booking options are included in granular response is unknown |
| `POST /venues/{venueId}/courts/{courtId}/sports` | No | `CourtSportRequest` exists for court creation | Court detail / Sports | Add sport dialog | Creation type is related but granular contract is **unproven** | Granular defaults, IDs, booking options and response required |
| `DELETE /venues/{venueId}/courts/{courtId}/sports/{courtSportId}` | No | Aggregate sports use numeric IDs | Sport danger action | Dependency warning + confirmation | Path IDs known; response unknown | Pricing/equipment cascade or conflict behavior required |
| `PUT /venues/{venueId}/courts/{courtId}/sports/{courtSportId}` | No | Aggregate editor changes capacity/durations | Sport editor | Focused save | **Unknown update request/response** | Patch-vs-replace semantics and editable fields required |
| `GET /venues/{venueId}/courts/{courtId}/sports/{courtSportId}/equipment` | No | Aggregate `CourtRecordEquipment[]` | Sport / Equipment | List with stock/prices | Candidate type exists; exact response not proven | Localized names, price currency/tier schema and pagination required |
| `POST /venues/{venueId}/courts/{courtId}/sports/{courtSportId}/equipment` | No | `CourtEquipmentRequest` lacks price tiers | Sport / Equipment | Add form | **Unknown create request/response** | Price representation and generated stable ID required |
| `DELETE /venues/{venueId}/courts/{courtId}/sports/{courtSportId}/equipment/{equipmentId}` | No | Aggregate equipment IDs optional | Equipment row action | Confirmation | Path IDs known; response unknown | Future-booking dependency behavior required |
| `PUT /venues/{venueId}/courts/{courtId}/sports/{courtSportId}/equipment/{equipmentId}` | No | Aggregate equipment/type fields | Equipment editor | Validated edit | **Unknown update request/response** | Patch-vs-replace, currency, tiers and reservation-limit rules required |
| `GET /venues/{venueId}/courts/{courtId}/sports/{courtSportId}/pricing` | No | Aggregate `CourtRecordPricingRule[]` | Sport / Pricing | Base, rules and groups sub-sections | Candidate rule type exists; full response **unknown** | Base/group containers, precedence and currency ownership required |
| `POST /venues/{venueId}/courts/{courtId}/sports/{courtSportId}/pricing` | No | Aggregate pricing rule fields | Sport / Pricing rules | Add validated rule | **Unknown create request/response** | Rule type enum, overlap rules, time format and stable ID required |
| `POST /venues/{venueId}/courts/{courtId}/sports/{courtSportId}/pricing/base` | No | Court-create pricing has peak/off-peak fields | Sport / Base pricing | Set base price | **Unknown body/response** | Cents-vs-decimal amount and interaction with rule pricing required |
| `DELETE /venues/{venueId}/courts/{courtId}/sports/{courtSportId}/pricing/groups/{groupId}` | No | None | Sport / Pricing groups | Confirmation | Path IDs known; response unknown | Group DTO, future-booking impact and dependency behavior required |
| `PUT /venues/{venueId}/courts/{courtId}/sports/{courtSportId}/pricing/groups/{groupId}` | No | None | Sport / Pricing groups | Group editor | **Unknown request/response** | Group members, precedence, validity and currency fields required |
| `DELETE /venues/{venueId}/courts/{courtId}/sports/{courtSportId}/pricing/{ruleId}` | No | Aggregate rule IDs optional | Pricing rule action | Confirmation | Path IDs known; response unknown | Future-booking impact and stable ID type required |
| `PUT /venues/{venueId}/courts/{courtId}/sports/{courtSportId}/pricing/{ruleId}` | No | Aggregate rule fields | Pricing rule editor | Validated edit | **Unknown update request/response** | Replace/patch semantics, overlap and version behavior required |
| `GET /venues/{venueId}/discounts` | No | None | Venue detail / Discounts | Table/list with retry | **Unknown list/pagination/item DTO** | Status, value type, eligibility and usage fields required |
| `POST /venues/{venueId}/discounts` | No | None | Venue / Discounts | Create form | **Unknown request/response** | Promotion-vs-discount naming, amount units and eligibility contract required |
| `DELETE /venues/{venueId}/discounts/{discountId}` | No | None | Discount row action | Confirmation | Path IDs known; response unknown | Existing/future redemption dependency behavior required |
| `PUT /venues/{venueId}/discounts/{discountId}` | No | None | Discount editor | Validated save | **Unknown request/response** | Update semantics and immutable fields required |
| `GET /venues/{venueId}/promotions/{promotionId}/redemptions` | No | None | Discount/promotion row → redemptions | Paginated history table | **Unknown query/response/page DTO** | Relationship between discount IDs and promotion IDs plus returned user/booking/value fields required |

## Court editor reconciliation

The current court page uses the vendor media type
`application/vnd.arena.court-record+json` and atomically reads/saves a
`CourtRecord` through `GET/PUT /venues/{venueId}/courts/{courtId}`. That record
contains sports, booking options, pricing, equipment, availability, layout,
cancellation-policy ID, images, and rules.

The granular routes appear intended to coexist during a migration, but no
authoritative granular contracts are available. Phase 1 therefore leaves the
aggregate editor as the only save mechanism for those nested resources and
adds court deletion as a separate danger-zone command. Introducing granular
editors now would create two competing sources of truth. Once schemas are
available, migrate one focused section at a time, remove that section from the
aggregate PUT payload (or obtain a backend version contract), and refetch only
the mutated resource plus dependent conflict data.

## Phase status

- **Phase 1:** store import, staff removal, court deletion, and active-contract
  update are connected to UI. User blocking is blocked on its body semantics.
- **Phase 2:** blocked on blackout, court-availability, court-limit,
  cancellation-policy, conflict, and layout contracts. Venue availability can
  still be viewed through the aggregate venue detail response.
- **Phase 3:** blocked on granular mutation/list contracts; the aggregate court
  editor remains the single source of truth.
- **Phase 4:** blocked on discount and redemption contracts.

Phase 1 is independently reviewable: its commands are isolated, destructive
operations confirm first, and rows/navigation change only after success.
