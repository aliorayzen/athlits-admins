# Athlits Admin — Design System

> Context file for the `impeccable` design skill. The concrete, authoritative
> tokens behind the [PRODUCT.md](./PRODUCT.md) principles. Source of truth is
> `src/app/globals.css` (`@theme` + `:root` + `.dark`); this document mirrors it
> for design reasoning. **If a value here and in `globals.css` disagree,
> `globals.css` wins** — update this file to match.

Stack: Next.js 15 (App Router) · Tailwind CSS v4 · shadcn/ui · `next-themes`.
Default theme: **dark**. Light theme is fully defined and must stay first-class.

## Color

Neutrals are tinted toward a cool blue-zinc hue (never pure `#000`/`#fff`).
Use the design-system tokens (`--bg-*`, `--text-*`, accents) for product UI;
the shadcn aliases (`--card`, `--muted`, …) back the component library.

### Dark (primary canvas)

| Token             | Value                     | Use                                  |
| ----------------- | ------------------------- | ------------------------------------ |
| `--bg-0`          | `#08090c`                 | App background (deepest)             |
| `--bg-1`          | `#0f1115`                 | Cards, panels, raised surfaces       |
| `--bg-2`          | `#161a1f`                 | Inputs, secondary fills, hover wells |
| `--bg-3`          | `#1c2128`                 | Tertiary fills, active states        |
| `--text-1`        | `#f2f3f5`                 | Primary text, headings               |
| `--text-2`        | `#b8bcc5`                 | Body / secondary text                |
| `--text-3`        | `#838999`                 | Muted, descriptions, captions        |
| `--text-4`        | `#555d6e`                 | Faint labels, placeholders, icons    |
| `--border`        | `rgba(255,255,255,0.065)` | Default hairline border              |
| `--border-strong` | `rgba(255,255,255,0.13)`  | Emphasized / hover border            |

### Light

| Token                               | Value                                         |
| ----------------------------------- | --------------------------------------------- |
| `--bg-0` `--bg-1` `--bg-2` `--bg-3` | `#f5f4f2` · `#ffffff` · `#f0efed` · `#e8e7e4` |
| `--text-1`…`--text-4`               | `#0b0f14` · `#555d6e` · `#838999` · `#a0a5b0` |
| `--border` / `--border-strong`      | `rgba(0,0,0,0.07)` / `rgba(0,0,0,0.12)`       |

### Accents & semantics (shared across themes unless noted)

| Role                | Token                           | Value                                  | Meaning                                         |
| ------------------- | ------------------------------- | -------------------------------------- | ----------------------------------------------- |
| **Primary / Admin** | `--teal`                        | `#00d4aa`                              | Primary actions, admin identity, focus rings    |
|                     | `--teal-text`                   | `#1de9b6` dark · `#00a88a` light       | Teal text/icons (legible per theme)             |
|                     | `--teal-subtle` / `--teal-glow` | `rgba(0,212,170,0.08)` / `…,0.12–0.15` | Tints, focus halo, button glow                  |
| **Secondary / VM**  | `--gold` = `--semantic-amber`   | `#f59e0b`                              | Venue-manager identity, warnings, money-at-risk |
|                     | `--semantic-amber-subtle`       | `rgba(245,158,11,0.1)`                 | Amber tint / badge fill                         |
| Success             | `--semantic-green`              | `#10b981`                              | Paid, active, confirmed                         |
| Danger              | `--semantic-red`                | `#f43f5e`                              | Destructive, overdue, errors, required `*`      |
| Info                | `--semantic-blue`               | `#6366f1`                              | Informational hints, neutral notices            |

**Color strategy: Restrained.** Tinted neutrals carry the surface; teal is the
single dominant accent (≤~10% of a screen), amber is the scoped secondary, and
the remaining semantics appear only with meaning. Do not collapse amber/teal
into one, and do not introduce hues outside this set. Charts use
`--chart-1..5` (`#00d4aa #10b981 #f59e0b #6366f1 #a78bfa`) — never a default
rainbow.

## Typography

- **Sans (UI + headings):** `Geist` → `--font-sans`, also `--font-heading`.
- **Mono:** `Geist Mono` → `--font-mono`. Use for numbers, IDs, currency,
  emails, generated passwords, and anything tabular (`tabular-nums`).
- Hierarchy comes from **scale + weight + color**, not decoration. Reference
  sizes in use: page title ~26px/600, section title ~15px/600, body ~13.5px,
  labels ~10px uppercase `tracking-[0.08em]` in `--text-4`.

## Shape, elevation & spacing

- **Radius:** base `--radius: 0.625rem` (10px) with a scale
  (`--radius-sm` 0.6× → `--radius-4xl` 2.6×). Inputs/buttons use `md`–`lg`,
  pills use full.
- **Elevation = border + subtle bg step + accent glow**, not heavy drop
  shadows. Raise a surface by moving `--bg-0 → --bg-1 → --bg-2` and/or
  `--border → --border-strong`. Accent buttons get a colored glow
  (`shadow-[0_0_20px_-6px_rgba(0,212,170,0.35)]`), not gray shadow.
- **Inputs:** 38px tall, `--bg-0` field on `--border`, icon at left
  (`--text-4`), focus = accent border + `0 0 0 3px <accent>-subtle` ring.
- Spacing is rhythmic, not uniform — group related fields tightly, separate
  sections generously (numbered `FormSection` pattern).

## Motion

- Easing `cubic-bezier(0.16, 1, 0.3, 1)`; durations 0.18s (hover) → 0.4s
  (enter). Animate **transform / opacity** only.
- Hover affordances: ≤1px lift + border/glow shift. Enter animations fade-up
  ~6px.
- **Always** honor `prefers-reduced-motion: reduce` (existing scoped styles do).

## Components & conventions

- shadcn/ui in `src/components/ui/` is the primitive layer — extend, don't
  fork. Layout chrome (sidebar, top bar) in `src/components/layout/`.
- Page-specific polish lives in **scoped CSS blocks** in `globals.css`
  (e.g. `.users-create-v2`, `.users-v2`, `.settings-v2`) so styles never leak.
  New complex surfaces follow this scoped-class pattern.
- Accent-aware shared primitives (see
  `src/app/dashboard/users/create/_components/`) thread an `accent`
  (`"teal" | "amber"`) prop rather than duplicating per role.
- Accessibility: every input has an associated `<label htmlFor>` (use
  `useId()`), required fields mark with a red `*`, and interactive elements
  have designed hover/focus/active states.
- Native form controls (time/date pickers, scrollbars) follow the theme via
  `color-scheme: light` on `:root` and `color-scheme: dark` on `.dark` in
  `globals.css`; never restyle native picker chrome per component.
