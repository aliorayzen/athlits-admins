# Using ECC in Arena Admin Dashboard

A practical guide to Everything Claude Code (ECC) workflows in this project.

---

## How It All Fits Together

```
You type a message in Claude Code
        |
        v
  CLAUDE.md loaded (project context + ECC references)
        |
        v
  Global Rules loaded (common/ + typescript/ + web/)
        |
        v
  Claude processes your request using skills, agents, rules
        |
        v
  You edit code --> PostToolUse hooks fire:
    1. Prettier formats
    2. ESLint fixes
    3. TypeScript checks types
```

**Rules** = always-on guidelines Claude follows (coding style, security, testing).
**Skills** = workflows you invoke with slash commands (`/plan`, `/tdd`).
**Agents** = specialized sub-agents Claude dispatches automatically or on demand.
**Hooks** = shell commands that run after every file edit.

---

## Daily Workflows

### 1. Planning a Feature

When you want to add something new (e.g., "add booking management page"):

```
/plan Add a booking management page with list, detail, and create views
```

What happens:

- The **planner agent** analyzes the codebase
- Creates a phased implementation plan
- Identifies files to create/modify
- Flags dependencies and risks

You review and approve before any code is written.

### 2. Building with TDD

After planning, use test-driven development:

```
/tdd Implement the booking list page
```

The workflow:

1. **RED** — writes a failing test first
2. **GREEN** — implements minimal code to pass
3. **IMPROVE** — refactors while keeping tests green
4. Verifies 80%+ coverage

### 3. Just Building (No TDD)

For quick changes, just describe what you want:

```
"Add a loading spinner to the venues table"
```

Claude will:

- Follow the TypeScript + web rules automatically
- Auto-format with Prettier after each edit
- Auto-fix ESLint issues
- Report type errors immediately

### 4. Code Review

After writing code, review it:

```
/code-review
```

Or Claude auto-dispatches the **code-reviewer** and **typescript-reviewer** agents after significant changes. The review checks:

- Code quality (functions < 50 lines, files < 800 lines)
- Security (no hardcoded secrets, XSS/CSRF protection)
- TypeScript strictness (no `any`, proper error handling)
- Web performance (bundle size, CWV targets)

### 5. Security Review

Before committing auth or API changes:

```
/security-review
```

Checks for:

- Hardcoded tokens or API keys
- XSS via `dangerouslySetInnerHTML`
- Missing input validation
- CSRF protection gaps
- JWT handling issues (relevant for this project's auth flow)

### 6. Fixing Build Errors

When `npm run build` breaks:

```
/build-fix
```

The **build-error-resolver** agent reads the errors and fixes them incrementally, verifying after each fix.

### 7. Frontend Design

When creating new UI components:

```
/frontend-design Create a booking calendar component
```

This skill enforces the design quality rules:

- No generic template-looking UI
- Dark luxury theme consistency (gold/amber on zinc)
- Proper hierarchy, depth, and motion
- shadcn/ui component reuse

### 8. Pre-Commit Verification

Before committing:

```
/verify
```

Runs the full verification loop:

- ESLint (no warnings)
- TypeScript (no type errors)
- Tests pass
- Build succeeds

---

## What Happens Automatically

You don't need to invoke these — they fire on their own:

| Trigger             | What Runs                              | Why                              |
| ------------------- | -------------------------------------- | -------------------------------- |
| You edit any file   | Prettier formats it                    | Consistent code style            |
| You edit any file   | ESLint auto-fixes                      | Catches lint issues early        |
| You edit any file   | `tsc --noEmit` runs                    | Surfaces type errors immediately |
| You write code      | `code-reviewer` agent considers review | Quality gate                     |
| You touch auth code | `security-reviewer` agent flags risks  | Security gate                    |
| Build fails         | `build-error-resolver` available       | Fast recovery                    |

---

## Rules That Apply Here

### From `common/`

- **Immutability**: Never mutate state — always spread/copy
- **File size**: Keep files under 800 lines, functions under 50 lines
- **Error handling**: Always handle errors explicitly, never swallow them
- **No hardcoded secrets**: Use env vars for API URLs, keys, tokens
- **Testing**: 80%+ coverage target, AAA pattern (Arrange-Act-Assert)
- **Git**: Conventional commits (`feat:`, `fix:`, `refactor:`, etc.)

### From `typescript/`

- **Strict mode**: `strict: true` in tsconfig (already configured)
- **No `any`**: Use `unknown` with type narrowing
- **Prefer `const`**: Never `var`, minimize `let`

### From `web/`

- **Core Web Vitals**: LCP < 2.5s, INP < 200ms, CLS < 0.1
- **Bundle budget**: < 300kb JS (gzipped) for app pages
- **Animation**: Only animate `transform`, `opacity`, `clip-path`
- **Semantic HTML**: Use `<section>`, `<nav>`, `<main>` over `<div>` stacks
- **Design quality**: No default template look — intentional hierarchy, depth, motion
- **CSP**: Nonce-based Content Security Policy for production
- **Accessibility**: Keyboard navigation, ARIA labels, color contrast

---

## Project-Specific Patterns

These patterns are specific to arena-admins and enforced by CLAUDE.md:

| Pattern       | Rule                                                    |
| ------------- | ------------------------------------------------------- |
| API calls     | Always through `src/lib/api.ts` typed wrappers          |
| Auth state    | Via `AuthProvider` context, never direct localStorage   |
| Types         | Must match Spring Boot DTOs in `src/types/api.ts`       |
| UI components | shadcn/ui in `src/components/ui/` — don't edit directly |
| Theme         | Dark mode default, gold/amber accent on deep zinc       |
| State updates | Immutable — spread operator, never mutate               |

---

## Quick Reference Card

```
/plan <feature>          Plan before building
/tdd <feature>           Test-first development
/code-review             Review what you just wrote
/build-fix               Fix broken builds
/security-review         Check auth/API code security
/verify                  Full pre-commit check
/frontend-design <comp>  Design-quality UI building
/simplify                Clean up after implementing
/e2e                     Generate E2E tests
```

---

## Troubleshooting

### "Hooks aren't running"

Check `.claude/settings.json` has the `hooks` section. Restart Claude Code after editing.

### "Rules don't seem active"

Rules load from `~/.claude/rules/`. Verify they exist:

```bash
ls ~/.claude/rules/common/
ls ~/.claude/rules/typescript/
ls ~/.claude/rules/web/
```

### "Skill not found"

Make sure the ECC plugin is enabled:

```json
// .claude/settings.json
{ "enabledPlugins": { "ecc@ecc": true } }
```

### "Type errors after every edit"

The tsc hook reports errors but doesn't block. Fix them before committing — the `/verify` skill will catch remaining issues.
