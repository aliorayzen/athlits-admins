# Athlits Admin — Light-Mode Conversion

**Date:** 2026-09-14
**Slice:** A of 5 (see "Ticket decomposition" below)
**Status:** approved, in implementation

## Ticket decomposition

The originating ticket bundles five independent projects. Each gets its own
spec → plan → implementation cycle. This document covers **A only**.

| #   | Slice                                                                                          | Depends on |
| --- | ---------------------------------------------------------------------------------------------- | ---------- |
| A   | Light-mode conversion + Athlits theme                                                          | —          |
| B   | Onboarding VM page: field removal, conditional payment modes, USD+LBP, always-clickable submit | —          |
| C   | Overview page: active users, revenue, overdue, venues-by-region, bookings filters              | A          |
| D   | Invoices row actions → kebab menu                                                              | A          |
| E   | Venue Managers kebab menu, staff differentiation, staff → main venues                          | A          |

A goes first so C/D/E are built once, in the final palette, instead of being
restyled twice.

## Problem

The app is dark-only: `src/app/layout.tsx` hardcodes `dark` on `<html>`. A light
token set exists in `globals.css` but is not shippable:

| Token pair (light)                                     | Measured | Required |
| ------------------------------------------------------ | -------- | -------- |
| `--text-3` `#838999` on `#ffffff`                      | 3.50:1   | 4.5:1    |
| `--text-4` `#a0a5b0` on `#ffffff`                      | 2.47:1   | 4.5:1    |
| `--teal-text` `#00a88a` on `#ffffff`                   | 3.01:1   | 4.5:1    |
| `--semantic-amber` on `#ffffff`                        | 2.15:1   | 4.5:1    |
| `--semantic-green` on `#ffffff`                        | 2.54:1   | 4.5:1    |
| `--primary-foreground` `#fff` on `--primary` `#00b89e` | 2.50:1   | 4.5:1    |

Two further defects: neutrals are temperature-split (backgrounds hue 85 warm,
text hue 265 cool), and `--bg-1` is pure `#ffffff`, which `DESIGN.md` forbids.

Separately, ~90 hardcoded `rgba(255,255,255,α)` literals (66 across 14 `.tsx`
files, 12 in `globals.css`, 15 distinct alpha values) assume a dark backdrop.
On light they render as invisible white-on-white.

## Scene

An Athlits ops admin in the Beirut office, on a 24-inch monitor, 9am to 6pm
with daylight through the window, cross-referencing an invoice on screen
against a printed contract on the desk while a venue manager waits on the
phone.

Daylight ambient, long sessions, paper cross-reference, dense data. Light wins.

## Color strategy: Restrained

Product-register floor. Brand-tinted neutrals carry the surface; teal is the
single dominant accent at ≤10% coverage; amber stays scoped to venue-manager
identity; green/red/blue appear only with semantic meaning.

**Reflex check.** First-order ("sports admin → dark with neon") is avoided by
going light. Second-order ("light admin → white cards on cool gray-50 with one
teal accent") is avoided by tinting _every_ neutral toward the brand teal
(hue 195, chroma 0.002–0.008) so surfaces read as cool porcelain rather than
default gray, and by keeping the canvas/card/well stack a genuine three-step
elevation rather than white-on-gray-50.

## Token design

All values solved numerically against WCAG, not eyeballed.

### Surfaces — hue 195, brand-tinted

| Token    | Value     | OKLCH           | Use                            |
| -------- | --------- | --------------- | ------------------------------ |
| `--bg-0` | `#f1f5f5` | 96.8% 0.005 195 | App canvas                     |
| `--bg-1` | `#fbfdfd` | 99.2% 0.002 195 | Cards, panels (not pure white) |
| `--bg-2` | `#e9efef` | 94.8% 0.006 195 | Inputs, wells, hover           |
| `--bg-3` | `#dfe7e7` | 92.2% 0.008 195 | Tertiary fills, active         |

### Text — hue 240, cool ink

| Token      | Value     | On card | Use                                                |
| ---------- | --------- | ------- | -------------------------------------------------- |
| `--text-1` | `#131c22` | 16.90:1 | Headings, primary                                  |
| `--text-2` | `#4c5860` | 7.16:1  | Body, secondary                                    |
| `--text-3` | `#6b767e` | 4.55:1  | Captions, placeholders                             |
| `--text-4` | `#8a9299` | 3.09:1  | **Decorative and disabled only** — never body copy |

`--text-4` is below AA by design; it is reserved for non-text UI (icon strokes,
divider glyphs) and disabled controls, which are exempt under SC 1.4.3.
Placeholders move from `--text-4` to `--text-3`.

### Accents — light variants

Light-mode accents are _darker_ than their dark-mode counterparts. Each solid
fill is solved so a white label reaches 4.6:1, which also clears SC 1.4.11
against the card.

| Role            | Fill (white label) | Wash      | Ink on wash |
| --------------- | ------------------ | --------- | ----------- |
| Teal / primary  | `#008567`          | `#dff7ee` | `#007c5e`   |
| Amber / VM      | `#b55d00`          | `#ffebdc` | `#aa5300`   |
| Green / success | `#008653`          | `#e0f7e9` | `#007d4b`   |
| Red / danger    | `#d53b4b`          | `#ffe6e5` | `#c72b3f`   |
| Blue / info     | `#5d68e3`          | `#e8efff` | `#545dd8`   |

Charts: `#009e7d #c56c0c #6b79ea #db4f59 #9470cd` — equal lightness (62%),
all ≥3:1 on canvas.

### Neutral tint scale (the ~90-literal fix)

Seven theme-aware steps replace every hardcoded `rgba(255,255,255,α)`:

| Token      | Light                 | Dark                      |
| ---------- | --------------------- | ------------------------- |
| `--tint-1` | `rgba(9,20,26,0.020)` | `rgba(255,255,255,0.015)` |
| `--tint-2` | `rgba(9,20,26,0.032)` | `rgba(255,255,255,0.025)` |
| `--tint-3` | `rgba(9,20,26,0.048)` | `rgba(255,255,255,0.040)` |
| `--tint-4` | `rgba(9,20,26,0.065)` | `rgba(255,255,255,0.065)` |
| `--tint-5` | `rgba(9,20,26,0.090)` | `rgba(255,255,255,0.090)` |
| `--tint-6` | `rgba(9,20,26,0.130)` | `rgba(255,255,255,0.130)` |
| `--tint-7` | `rgba(9,20,26,0.190)` | `rgba(255,255,255,0.200)` |

Literal → step mapping: `0.008–0.015`→1, `0.018–0.03`→2, `0.035–0.04`→3,
`0.05–0.065`→4, `0.08–0.10`→5, `0.13–0.15`→6, `0.2`→7.

### Elevation

Dark builds elevation from border + surface step + accent glow, with no
shadows. That reads flat on light, where shadow is the primary depth cue.
Three theme-aware shadow tokens are added; the dark values stay near-invisible
so dark-mode elevation keeps working as it does today.

## Non-goals (deliberately excluded)

- `.invoice-doc` (globals.css:1569) stays fixed white/ink in both themes. It
  simulates a printed page; theming it would be wrong.
- `.sidebar-v2`'s gradient mesh gets a purpose-built light composition rather
  than a token swap, because a dark-atmospheric mesh has no light equivalent.
- No change to layout, spacing, typography, or component structure. This slice
  is color and theme only.

## Theme mechanism

`next-themes@0.4.6` is already a dependency but unused. Wire it:

- `ThemeProvider` in `src/components/providers.tsx`: `attribute="class"`,
  `defaultTheme="light"`, `enableSystem`.
- `src/proxy.ts` already mints a per-request nonce and sets `x-nonce`. The root
  layout reads it and passes `nonce` to `ThemeProvider`, so the pre-hydration
  script survives `'strict-dynamic'`.
- `dark` is removed from `<html>`; `suppressHydrationWarning` added.
- `settings/page.tsx` theme picker moves from dead `useState` to `useTheme()`.

Dark mode is retained, not deleted. Light becomes the default.

## Context-file updates

`PRODUCT.md` principle 4 ("Dark-first, light-capable") inverts to
"Light-first, dark-capable", and the anti-reference list keeps "flat
gray-on-white admin panels" but gains the clarification that our light surface
is brand-tinted, not neutral gray. `DESIGN.md` color tables are rewritten
against the solved values. Without this, every future `/impeccable` run designs
against the old direction.

## Verification

- Contrast: every text/background pair in both themes re-measured with the
  solver in `scripts/`; no AA failure outside the documented `--text-4` and
  disabled-control exemptions.
- `npm run lint` and `npm run build` green.
- Manual sweep of every route in both themes for white-on-white regressions.
