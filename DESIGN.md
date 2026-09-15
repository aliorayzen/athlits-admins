# Athlits Admin — Design System

> Context file for the `impeccable` design skill. The concrete, authoritative
> tokens behind the [PRODUCT.md](./PRODUCT.md) principles. Source of truth is
> `src/app/globals.css` (`@theme` + `:root` + `.dark`); this document mirrors it
> for design reasoning. **If a value here and in `globals.css` disagree,
> `globals.css` wins** — update this file to match.

Stack: Next.js 15 (App Router) · Tailwind CSS v4 · shadcn/ui · `next-themes`.
Default theme: **light**. Dark is retained and must stay first-class.

Run `node scripts/check-contrast.mjs` after ANY token edit. It parses the two
token blocks out of `globals.css` and fails the build on a WCAG regression —
the pre-conversion light palette failed six pairs silently.

## Color

Neutrals are tinted toward the brand teal (hue 195 light / cool blue-zinc dark)
— never pure `#000`/`#fff`. Use the design-system tokens (`--bg-*`, `--text-*`,
accents) for product UI; the shadcn aliases (`--card`, `--muted`, …) back the
component library.

**Light accents are darker than dark-mode accents.** Each light fill is solved
so a white label clears 4.6:1, which also satisfies SC 1.4.11 against the card.
Porting `#00d4aa` into light gives 1.9:1 and is unreadable. Never do it.

### Light (primary canvas)

| Token             | Value                 | Use                                   |
| ----------------- | --------------------- | ------------------------------------- |
| `--bg-0`          | `#f1f5f5`             | App canvas                            |
| `--bg-1`          | `#fbfdfd`             | Cards, panels, raised surfaces        |
| `--bg-2`          | `#e9efef`             | Inputs, secondary fills, hover wells  |
| `--bg-3`          | `#dfe7e7`             | Tertiary fills, active states         |
| `--text-1`        | `#131c22`             | Primary text, headings (16.9:1)       |
| `--text-2`        | `#424c54`             | Body / secondary (7.5:1)              |
| `--text-3`        | `#525d65`             | Muted, captions, placeholders (5.8:1) |
| `--text-4`        | `#626c74`             | Faint labels, icons (4.6:1)           |
| `--border`        | `rgba(9,20,26,0.065)` | Default hairline border               |
| `--border-strong` | `rgba(9,20,26,0.13)`  | Emphasized / hover border             |

Light has far less range than dark, so all four text steps clear AA and
hierarchy leans on weight and scale. In dark, `--text-4` stays decorative-only.

### Dark

| Token                               | Value                                         |
| ----------------------------------- | --------------------------------------------- |
| `--bg-0` `--bg-1` `--bg-2` `--bg-3` | `#08090c` · `#0f1115` · `#161a1f` · `#1c2128` |
| `--text-1`…`--text-4`               | `#f2f3f5` · `#b8bcc5` · `#838999` · `#5f6775` |
| `--border` / `--border-strong`      | `rgba(255,255,255,0.065)` / `…,0.13`          |

### Accents & semantics

Each role has three forms: a **fill** (solid, carries an on-ink label), a
**wash** (`-subtle`, badge background) and a **text** variant (safe as small
text on any surface). Use the text variant whenever the color IS the text.

| Role                | Fill — light / dark   | Text variant (light)     | On-ink — light / dark            |
| ------------------- | --------------------- | ------------------------ | -------------------------------- |
| **Primary / Admin** | `#008567` / `#00d4aa` | `--teal-text` `#007960`  | `--on-teal` `#fff` / `#032921`   |
| **Secondary / VM**  | `#b55d00` / `#f59e0b` | `--amber-text` `#aa5300` | `--on-amber` `#fff` / `#1a1204`  |
| Success             | `#008653` / `#10b981` | `--green-text` `#007847` | `--on-teal`                      |
| Danger              | `#d53b4b` / `#f43f5e` | `--red-text` `#c52a3f`   | `--on-danger` `#fff` / `#130505` |
| Info                | `#5d68e3` / `#7882ef` | `--blue-text` `#545dd8`  | `--on-info` `#fff` / `#070815`   |

**Alpha-bearing accents use channel triplets**, so one definition flips the hue
per theme while each call site keeps its own alpha: `rgb(var(--teal-rgb)/0.3)`.
Triplets: `--teal-rgb`, `--amber-rgb`, `--green-rgb`, `--red-rgb`,
`--indigo-rgb`. Write the slash with **no spaces** — spaces break Tailwind
arbitrary values.

**Neutral tints.** Never write `rgba(255,255,255,α)` or `rgba(0,0,0,α)`
directly; that is exactly what made the app dark-only. Use `--tint-1`…
`--tint-7`, which tint with ink on light and with light on dark. `--inset-hi`
is the top-edge highlight, `--scrim` the modal backdrop, `--shadow-1/2/3` the
elevation ramp.

**Color strategy: Restrained.** Tinted neutrals carry the surface; teal is the
single dominant accent (≤~10% of a screen), amber is the scoped secondary, and
the remaining semantics appear only with meaning. Do not collapse amber/teal
into one, and do not introduce hues outside this set — a stray Tailwind cyan is
exactly what this rule exists to catch. Charts use `--chart-1..5`, light
`#009e7d #c56c0c #6b79ea #db4f59 #9470cd` at equal lightness — never a default
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
- **Elevation**: on dark, border + subtle bg step + accent glow, almost no
  shadow. On light that reads flat, so light carries real shadow. Use the
  theme-aware `--shadow-1/2/3` rather than hand-rolled `rgba(0,0,0,α)`. Raise a surface by moving `--bg-0 → --bg-1 → --bg-2` and/or
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
