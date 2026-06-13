# Prompt: Separate Admin & Venue Manager Creation Flows

> Paste everything below the line into a fresh Claude Code session running in the
> `arena-admins` repo. It is self-contained.

---

## Task

In the Arena Admin dashboard, **split the single combined "Create user" page into two
separate, dedicated creation flows** — one for **Admins** and one for **Venue Managers**.
Today both roles share one form (`src/app/dashboard/users/create/page.tsx`) that branches
on a `role` toggle. Replace that toggle-driven form with two purpose-built pages.

The backend endpoints and typed API wrappers **already exist and already work** — do not
change the network layer. This is a UI/routing refactor that uses the existing API calls.

## Existing API contract (do NOT modify — just consume)

Wrappers live in `src/lib/api.ts`; request/response types live in `src/types/api.ts`.

### Create Admin

- **Endpoint:** `POST /api/admin/v1/users/admin` (Bearer auth)
- **Wrapper:** `createAdmin(payload: CreateAdminRequest): Promise<UserDto>`
- **Request body — `CreateAdminRequest`:**
  | field | type | required | notes |
  | ----------- | ------ | -------- | ------------------------------ |
  | `email` | string | yes | OTP login — no password needed |
  | `firstName` | string | yes | |
  | `lastName` | string | yes | |
- **Response:** `UserDto`. Admins log in via a one-time code emailed to them.

### Create Venue Manager

- **Endpoint:** `POST /api/admin/v1/users/venue-manager` (Bearer auth)
- **Wrapper:** `createVenueManager(payload: CreateVmUserRequest): Promise<UserDto>`
- **Request body — `CreateVmUserRequest`:**
  | field | type | required | notes |
  | ------------- | ------ | -------- | ------------------------------------------------ |
  | `email` | string | yes | |
  | `firstName` | string | yes | |
  | `lastName` | string | yes | |
  | `phoneNumber` | string | yes | required for VMs |
  | `tempPassword`| string | yes | VM logs in with email + temp password; rotated on first login |
- **Response:** `UserDto`. Share the temp password via a secure channel; it is not shown again.

> Swagger reference: <https://src-mobile-app.onrender.com/swagger-ui/index.html#/> —
> schemas `CreateAdminRequest`, `CreateVmUserRequest`, `UserDto`.

## Target structure

```
src/app/dashboard/users/
├── create/
│   ├── page.tsx               # → becomes a lightweight role CHOOSER (two cards)
│   ├── admin/page.tsx         # NEW — Admin-only form (email, firstName, lastName)
│   └── venue-manager/page.tsx # NEW — VM-only form (+ phoneNumber, tempPassword)
```

- Keep the route `/dashboard/users/create` working — the Users list links there twice
  (`src/app/dashboard/users/page.tsx:335` and `:1011`). Turn it into a small chooser
  screen with two cards ("Create Admin" / "Create Venue Manager") that link to the two
  new routes. (Reuse the existing `RoleCard` look from the current page.)
- `admin/page.tsx`: steps = Personal info → Contact (email only) → submit. No password,
  no phone. Calls `createAdmin`. Teal accent (matches existing Admin styling).
- `venue-manager/page.tsx`: steps = Personal info → Contact (email + phone) →
  Credentials (temp password with generator + strength meter) → submit. Calls
  `createVenueManager`. Amber accent (matches existing VM styling).
- Each page has its own back link, header copy, validation, success toast, and preview
  card. Preserve the polished UX already in the current combined page (password
  generator, `passwordStrength`, ⌘/Ctrl+Enter submit, preview panel) — move the relevant
  pieces into the VM page, and extract anything shared (e.g. `TextField`, `FormSection`,
  `PreviewRow`) into a small shared module (e.g. `users/create/_components/`) rather than
  duplicating it.

## Constraints (project conventions — enforce strictly)

- **Next.js 15 App Router.** This repo's Next.js may differ from training data — before
  writing routing/page code, check `node_modules/next/dist/docs/` and heed deprecations
  (see `AGENTS.md`).
- **TypeScript strict, no `any`.** Use `unknown` + narrowing for error handling.
- **Immutable state updates** — spread, never mutate.
- **Dark luxury theme** — reuse existing CSS variables (`--bg-*`, `--text-*`, `--teal*`,
  `--semantic-amber`, etc.) and the existing class conventions. Do not introduce new
  hardcoded colors. Match `web/design-quality.md` (no template-grade UI).
- **Files < 800 lines, functions < 50 lines.** Extract shared sub-components instead of
  copy-paste.
- **Validation at the boundary**: Admin requires email + first + last; VM additionally
  requires a valid phone and a temp password meeting the existing strength rule.
- Handle API failures explicitly with a user-facing `toast.error`; on success `toast.success`
  then `router.push("/dashboard/users")`.

## Acceptance criteria

1. `/dashboard/users/create` shows a chooser, not a form.
2. `/dashboard/users/create/admin` creates an admin via `createAdmin` with **only**
   `{ email, firstName, lastName }` — no phone or password fields visible.
3. `/dashboard/users/create/venue-manager` creates a VM via `createVenueManager` with
   `{ email, firstName, lastName, phoneNumber, tempPassword }`, including the password
   generator + strength meter.
4. The Users list's "Create user" entry points still work (land on the chooser).
5. No shared logic is duplicated — common form primitives are extracted.
6. `npm run build` and `npm run lint` pass; no TypeScript errors; no `console.log`.

## Suggested workflow

1. Run `/plan` to lay out the file moves and shared-component extraction before coding.
2. Implement the chooser + two pages + shared `_components`.
3. Run `/verify` (lint, types, build). Fix until green.
4. Run `/code-review` on the diff.
