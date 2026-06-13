# Athlits Admin Dashboard

## Project Overview

Internal admin dashboard for managing the Athlits sports venue booking platform. Frontend-only Next.js application that communicates with a Spring Boot backend API.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS v4 + shadcn/ui (dark luxury theme)
- **HTTP**: Axios with JWT interceptors
- **Auth**: OTP-based admin login via `/api/admin/v1/auth/`
- **Backend**: Spring Boot at `NEXT_PUBLIC_API_URL` (default: http://localhost:8080)

## Architecture

```
src/
├── app/                  # Next.js App Router pages
│   ├── login/            # OTP login flow
│   └── dashboard/        # Protected admin pages
│       ├── venues/       # Venue CRUD + detail
│       ├── users/        # Admin & VM creation
│       └── settings/     # Account info
├── components/
│   ├── ui/               # shadcn/ui components (DO NOT edit directly unless extending)
│   ├── layout/           # Sidebar, TopBar
│   └── providers.tsx     # ThemeProvider, AuthProvider, TooltipProvider
├── context/              # React context (auth)
├── lib/                  # API client, token store, utilities
└── types/                # TypeScript types matching Spring Boot DTOs
```

## Key Conventions

- **Dark mode by default** — theme uses gold/amber accent on deep zinc
- **All API calls** go through `src/lib/api.ts` (typed wrappers around `apiClient`)
- **Auth state** managed via `AuthProvider` context — JWT tokens in localStorage
- **Types in `src/types/api.ts`** must match the Spring Boot DTOs exactly
- **Immutable updates** — never mutate state directly, use spread operator
- **No `any`** — use `unknown` with narrowing for error handling

## Backend API

Admin endpoints are at `/api/admin/v1/`:

- Auth: `login` (request OTP), `verify-otp`, `refresh`, `logout`
- Venues: CRUD, status management, manager assignment
- Users: Create admin, create venue manager

See `src/types/api.ts` for the full type definitions.

## Environment Variables

```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Commands

```bash
npm run dev     # Start dev server
npm run build   # Production build
npm run lint    # ESLint
```

## Design System — `impeccable` (REQUIRED for all UI work)

**Every new UI surface and every UI change MUST go through the `impeccable`
skill**, bound to this project's design context. This is the single source of
truth for visual/interaction decisions in Athlits Admin.

- **Context files (already wired):** [`PRODUCT.md`](./PRODUCT.md) (who we
  serve, register=`product`, principles) and [`DESIGN.md`](./DESIGN.md) (the
  authoritative tokens — colors, type, radius, motion). Keep `DESIGN.md` in
  sync with `src/app/globals.css` (globals.css wins on conflict).
- **Skill location:** `.claude/skills/impeccable/` (vendored, committed,
  Apache-2.0 — see its `NOTICE.md`).

### How to apply it

| Situation                                     | Invoke                                                                           |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| Building a **new** component / page / surface | `/impeccable shape` (plan the design) → then `/impeccable craft` to implement    |
| **Changing / polishing** existing UI          | `/impeccable critique` or `/impeccable audit` → `/impeccable polish`             |
| Specific axes                                 | `/impeccable layout · typeset · colorize · animate · clarify · bolder · quieter` |
| Accessibility / responsive / edge cases       | `/impeccable harden · adapt`                                                     |

Always design **within the existing tokens** (`--bg-*`, `--text-*`, `--teal*`,
`--semantic-amber`/`--gold`, …). Never introduce hardcoded one-off colors,
radii, or shadows — extend the scoped-CSS + accent-prop patterns already in the
codebase (e.g. `src/app/dashboard/users/create/_components/`).

### Precedence (reconciliation with existing rules)

1. **`impeccable` + `DESIGN.md`/`PRODUCT.md`** — authoritative for all concrete
   visual, layout, color, motion, and UX-copy decisions. **Wins on conflict.**
2. **Global `web/design-quality.md` + `web/` rules** — still apply for
   anti-template policy, Core Web Vitals, bundle budgets, CSP, and a11y. They
   align with impeccable; where specifics differ, `DESIGN.md` tokens win.
3. The ECC **`/frontend-design`** skill is **superseded by `impeccable`** for
   this project — prefer `/impeccable`. Only fall back to `/frontend-design`
   if explicitly asked.

## ECC Integration

This project uses [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) (ECC plugin + global rules).

### Skills (use these as slash commands)

| Skill              | When to Use                                                           |
| ------------------ | --------------------------------------------------------------------- |
| `/plan`            | Before implementing a new feature — creates a step-by-step plan       |
| `/tdd`             | Writing new features or fixing bugs — test-first workflow             |
| `/code-review`     | After writing code — quality, security, and maintainability check     |
| `/build-fix`       | When `npm run build` fails — incremental error resolution             |
| `/e2e`             | Generate and run Playwright E2E tests for critical flows              |
| `/verify`          | Pre-commit verification loop (lint, types, tests, build)              |
| `/security-review` | Before committing auth, API, or user-input code                       |
| `/simplify`        | After implementing — clean up and reduce complexity                   |
| `/impeccable`      | **All UI work** — new surfaces & UI changes (see Design System above) |
| `/frontend-design` | Superseded by `/impeccable` for this project — use only if asked      |

### Agents (auto-dispatched by Claude)

| Agent                  | Triggers When                         |
| ---------------------- | ------------------------------------- |
| `code-reviewer`        | Code is written or modified           |
| `typescript-reviewer`  | TypeScript-specific issues            |
| `security-reviewer`    | Auth, API, or user-input code changed |
| `build-error-resolver` | Build fails                           |
| `planner`              | Complex feature requested             |
| `tdd-guide`            | New feature or bug fix                |

### Active Rules (loaded globally)

- `common/` — coding style, security, testing (80%+ coverage), git workflow
- `typescript/` — strict types, no `any`, ESM/CJS conventions
- `web/` — Core Web Vitals, bundle budgets, design quality, CSP, accessibility

### Hooks (auto-run after every edit)

1. **Prettier** — auto-formats on save
2. **ESLint** — auto-fixes lint issues
3. **TypeScript** — reports type errors

@AGENTS.md
