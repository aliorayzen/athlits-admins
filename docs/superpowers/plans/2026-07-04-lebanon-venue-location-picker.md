# Lebanon Venue Location Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shared Lebanon-only searchable location picker for venue creation and venue-manager onboarding.

**Architecture:** Generate a compact static catalogue from the supplied GeoNames rows, expose typed helper functions from `src/lib/lebanon-locations.ts`, and replace the existing free-form city input inside `VenueLocationFields`. Because all requested forms already use that component, the behavior lands across all flows with one UI change.

**Tech Stack:** Next.js App Router, React client components, TypeScript, existing Base UI popover primitive, existing design tokens.

---

### Task 1: Catalogue And Helpers

**Files:**
- Create: `src/lib/lebanon-locations-data.json`
- Create: `src/lib/lebanon-locations.ts`
- Create: `scripts/verify-lebanon-locations.mjs`

- [ ] Generate JSON rows from the supplied attachment, skipping header/example lines.
- [ ] Add typed helpers for governorates, city/district filtering, location filtering, and alias/name lookup.
- [ ] Run `node scripts/verify-lebanon-locations.mjs` and expect checks for Akkar, Mount Lebanon, South Lebanon, Beirut, Saida/South Lebanon, Sour alias Tyre, and coordinate types.

### Task 2: Shared Picker UI

**Files:**
- Modify: `src/components/venue-location-fields.tsx`

- [ ] Replace the free-form city input with three searchable combobox controls.
- [ ] Preserve manual latitude and longitude fields.
- [ ] When a location is selected, call `onCityChange(location.name)` and `onCoordinatesChange({ latitude, longitude })`.
- [ ] Seed existing city strings through `cityName()` and the catalogue lookup.
- [ ] Keep labels, focus states, required marker, and disabled states aligned with current form styling.

### Task 3: Verification

**Files:**
- No production file changes.

- [ ] Run `node scripts/verify-lebanon-locations.mjs`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Report any verification command that cannot run or fails.
