# Arena Admin Dashboard — Skills Enhancement Guide

This document maps every installed AI skill to the pages and workflows where it applies. Use this as a reference when enhancing any part of the dashboard.

## Installed Skills

### UI & Design Skills (apply per-page in this order)

| #   | Skill                 | Source          | Purpose                                                                       | Install                                               |
| --- | --------------------- | --------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | **ux-heuristics**     | wondelai/skills | Usability audit — find confusing flows, missing feedback, accessibility gaps  | `npx skills add wondelai/skills/ux-heuristics -y`     |
| 2   | **refactoring-ui**    | wondelai/skills | Visual hierarchy, spacing, color, depth — fix "looks off" problems            | `npx skills add wondelai/skills/refactoring-ui -y`    |
| 3   | **web-typography**    | wondelai/skills | Typeface selection, scale, line-height, tracking, font loading                | `npx skills add wondelai/skills/web-typography -y`    |
| 4   | **top-design**        | wondelai/skills | Award-winning polish — choreographed motion, atmospheric color, craft details | `npx skills add wondelai/skills/top-design -y`        |
| 5   | **microinteractions** | wondelai/skills | Button feedback, loading states, input animations, state transitions          | `npx skills add wondelai/skills/microinteractions -y` |

### Product & UX Strategy Skills

| Skill               | Source          | Purpose                                                                           | Install                                             |
| ------------------- | --------------- | --------------------------------------------------------------------------------- | --------------------------------------------------- |
| **hooked-ux**       | wondelai/skills | Habit-forming product design — trigger, action, variable reward, investment loops | `npx skills add wondelai/skills/hooked-ux -y`       |
| **design-sprint**   | wondelai/skills | 5-day validation process — prototype and test ideas fast                          | `npx skills add wondelai/skills/design-sprint -y`   |
| **jobs-to-be-done** | wondelai/skills | Understand why users "hire" the dashboard — design for real needs                 | `npx skills add wondelai/skills/jobs-to-be-done -y` |

### Code Quality Skills

| Skill                  | Source          | Purpose                                                                   | Install                                                |
| ---------------------- | --------------- | ------------------------------------------------------------------------- | ------------------------------------------------------ |
| **clean-code**         | wondelai/skills | Naming, small functions, error handling, readability                      | `npx skills add wondelai/skills/clean-code -y`         |
| **clean-architecture** | wondelai/skills | Dependency direction, separation of concerns, SOLID at architecture level | `npx skills add wondelai/skills/clean-architecture -y` |

### Go-to-Market Skills (for Arena launch)

| Skill                      | Source          | Purpose                                                                       | Install                                                    |
| -------------------------- | --------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **storybrand-messaging**   | wondelai/skills | Clear brand messaging — customer as hero, Arena as guide                      | `npx skills add wondelai/skills/storybrand-messaging -y`   |
| **hundred-million-offers** | wondelai/skills | Pricing, packaging, Grand Slam Offers for venue owners                        | `npx skills add wondelai/skills/hundred-million-offers -y` |
| **cro-methodology**        | wondelai/skills | Conversion rate optimization — objection handling, persuasion assets          | `npx skills add wondelai/skills/cro-methodology -y`        |
| **obviously-awesome**      | wondelai/skills | Product positioning — competitive alternatives, unique value, market category | `npx skills add wondelai/skills/obviously-awesome -y`      |

---

## Page Enhancement Map

### How to apply skills to a page

Run the 5 UI skills **sequentially in this order** on each page. Each skill sees different problems and builds on the previous:

```
1. ux-heuristics    → find usability issues (audit)
2. refactoring-ui   → fix visual hierarchy, spacing, color (structure)
3. web-typography   → refine type scale, pairings, readability (typography)
4. top-design       → push to award-winning level (polish)
5. microinteractions → add animations, feedback, state transitions (life)
```

### Per-Page Status

| Page             | UX Heuristics | Refactoring UI | Web Typography | Top Design | Microinteractions | Status       |
| ---------------- | :-----------: | :------------: | :------------: | :--------: | :---------------: | ------------ |
| **Login**        |     done      |      done      |      done      |    done    |       done        | **Complete** |
| **Dashboard**    |       -       |       -        |       -        |     -      |         -         | Pending      |
| **Venues List**  |       -       |       -        |       -        |     -      |         -         | Pending      |
| **Venue Detail** |       -       |       -        |       -        |     -      |         -         | Pending      |
| **Create Venue** |       -       |       -        |       -        |     -      |         -         | Pending      |
| **Invoices**     |       -       |       -        |       -        |     -      |         -         | Pending      |
| **Users**        |       -       |       -        |       -        |     -      |         -         | Pending      |
| **Settings**     |       -       |       -        |       -        |     -      |         -         | Pending      |

---

## Per-Page Enhancement Details

### Login Page (Complete)

**UX Heuristics (6 -> 9):**

- Added inline email validation with error message on blur
- Added "Resend code" button with 60s cooldown timer
- Added step labels ("Email" / "Verify") below progress bars
- Renamed button "Continue with Email" -> "Send Login Code"
- Made "Contact support" a real mailto link
- Added "Secure login" indicator with lock icon
- Replaced feature pills with social proof stats (24 venues, 99.9% uptime, 8 cities)

**Refactoring UI (7 -> 9):**

- Made "Welcome back" the dominant element (28px extrabold)
- De-emphasized secure label to 11px metadata below heading
- Removed redundant subtitle (form already communicates intent)
- Cut left panel description to one sentence
- Enlarged social proof numbers to 28px (dominant) with 10px labels (subordinate)
- Shrunk footer to 10.5px (barely visible, as it should be)

**Web Typography (7 -> 9):**

- Added `leading-none` on heading for tight line-height
- Standardized all uppercase label tracking to 0.06em
- Fixed Arena heading from 42px to 38px (1.36 ratio with 28px right panel heading)
- Normalized input text to 15px (standard scale stop, not 14.5px)
- Button text at 14px bold with tracking — hierarchy from weight, not size

**Top Design (8 -> 9):**

- Added staggered entry choreography (5 steps, 100ms apart, expo-out easing)
- Added atmospheric teal gradient glow on panel divider
- Added input focus micro-scale (1.01x)
- All animations use `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out)

**Microinteractions (7 -> 10):**

- OTP digits pop and turn teal-bordered when filled (`digit-pop` animation)
- Email input shows green checkmark when valid (`check-pop` animation)
- Both submit buttons have press feedback (`active:scale-[0.98]`)
- OTP step slides in from right (`slide-in-right`)
- "Ready to verify" appears in green when all 6 digits entered
- "Resend code" pulses 3 times when cooldown reaches 0 (`ready-pulse`)
- Back arrow translates left on hover (`group-hover:-translate-x-1`)

---

### Dashboard (Pending)

**Planned enhancements:**

| Skill             | What to do                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| ux-heuristics     | Trunk test on navigation, audit empty states, verify metric labels are clear                               |
| refactoring-ui    | Metrics strip hierarchy — big numbers, tiny labels. Card depth variation                                   |
| web-typography    | Metric number sizing on modular scale, greeting heading scale                                              |
| top-design        | Staggered metric entry, chart fade-in, activity feed progressive reveal                                    |
| microinteractions | Counter animation on metrics (count up from 0), card hover lift, venue row hover accent                    |
| hooked-ux         | Design the Hook cycle — what triggers admins to open the dashboard daily? Variable reward in activity feed |

---

### Venues List (Pending)

**Planned enhancements:**

| Skill             | What to do                                                                          |
| ----------------- | ----------------------------------------------------------------------------------- |
| ux-heuristics     | Search feedback (results count, no-results state), clear filter indicators          |
| refactoring-ui    | Table header de-emphasis, rating visual treatment, row spacing                      |
| web-typography    | Monospace slug alignment, rating number tabular-nums                                |
| top-design        | Table row stagger on first load, search input expand animation                      |
| microinteractions | Search icon animates on focus, "View" button hover feedback, status badge dot pulse |

---

### Venue Detail (Pending)

**Planned enhancements:**

| Skill             | What to do                                                                           |
| ----------------- | ------------------------------------------------------------------------------------ |
| ux-heuristics     | Status toggle needs clear consequence explanation, manager assign needs validation   |
| refactoring-ui    | Info card hierarchy — location/contact prominence, courts list spacing               |
| top-design        | Header parallax on scroll, card entry stagger                                        |
| microinteractions | Status toggle animation, assign manager success feedback, court list expand/collapse |

---

### Create Venue (Pending)

**Planned enhancements:**

| Skill             | What to do                                                                            |
| ----------------- | ------------------------------------------------------------------------------------- |
| ux-heuristics     | Required field indicators, inline validation on all fields, clear success redirect    |
| refactoring-ui    | Form section card spacing, toggle switch label hierarchy                              |
| web-typography    | Input placeholder sizing, section title scale                                         |
| microinteractions | Toggle switch animation, form section progressive reveal, submit button success state |

---

### Invoices (Pending)

**Planned enhancements:**

| Skill             | What to do                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------- |
| ux-heuristics     | Pay/void confirmation UX, filter state persistence, overdue alert prominence              |
| refactoring-ui    | Metrics strip hierarchy, invoice ID monospace treatment, amount column alignment          |
| top-design        | Filter tab transition animation, overdue row subtle pulse                                 |
| microinteractions | Tab switch slide transition, pay button success checkmark, void button confirmation shake |

---

### Users (Pending)

**Planned enhancements:**

| Skill             | What to do                                                                             |
| ----------------- | -------------------------------------------------------------------------------------- |
| ux-heuristics     | Form validation, password strength indicator for venue managers, success feedback      |
| refactoring-ui    | Role picker card balance, form/info panel proportion                                   |
| microinteractions | Role card selection animation (scale + glow), form field entry stagger, submit success |
| hooked-ux         | Onboarding hook — what brings admins back to create more users?                        |

---

### Settings (Pending)

**Planned enhancements:**

| Skill             | What to do                                            |
| ----------------- | ----------------------------------------------------- |
| ux-heuristics     | Copy-to-clipboard on User ID and API endpoint         |
| refactoring-ui    | Row hover depth, value vs label hierarchy             |
| microinteractions | Copy button with checkmark feedback, row hover accent |

---

## Strategy Skills — When to Use

These skills are not per-page — they apply to product-level decisions:

### hooked-ux

**Use when:** Designing features that should become habits (daily dashboard check, venue status monitoring)

```
Prompt: "What's the Hook cycle for our admin dashboard? Design the trigger, action,
variable reward, and investment that makes admins check Arena daily. Use hooked-ux skill."
```

### design-sprint

**Use when:** Validating a new feature idea before building (e.g., analytics dashboard, booking calendar)

```
Prompt: "Plan a 5-day design sprint for the Arena booking analytics feature.
Use design-sprint skill."
```

### jobs-to-be-done

**Use when:** Understanding what admins actually need from the dashboard

```
Prompt: "What job does an admin hire Arena dashboard to do? Write interview questions
to discover the real JTBD. Use jobs-to-be-done skill."
```

### storybrand-messaging

**Use when:** Writing the Arena marketing site or onboarding copy

```
Prompt: "Create a StoryBrand brand script for Arena SCR — position the venue owner
as the hero and Arena as the guide. Use storybrand-messaging skill."
```

### hundred-million-offers

**Use when:** Designing Arena's pricing and packaging for venue owners

```
Prompt: "Create a Grand Slam Offer for Arena SCR using the Value Equation.
Include pricing, bonuses, and guarantee. Use hundred-million-offers skill."
```

### cro-methodology

**Use when:** Optimizing Arena's signup or onboarding conversion

```
Prompt: "Audit Arena's venue onboarding flow. List the top 5 objections a venue owner
would have and create counter-objections. Use cro-methodology skill."
```

### obviously-awesome

**Use when:** Positioning Arena against competitors

```
Prompt: "Create a positioning canvas for Arena SCR — competitive alternatives,
unique value, target customer, market category. Use obviously-awesome skill."
```

---

## Quick Reference

### Install all skills at once

```bash
npx skills add wondelai/skills/ux-heuristics -y
npx skills add wondelai/skills/refactoring-ui -y
npx skills add wondelai/skills/web-typography -y
npx skills add wondelai/skills/top-design -y
npx skills add wondelai/skills/microinteractions -y
npx skills add wondelai/skills/hooked-ux -y
npx skills add wondelai/skills/design-sprint -y
npx skills add wondelai/skills/jobs-to-be-done -y
npx skills add wondelai/skills/clean-code -y
npx skills add wondelai/skills/clean-architecture -y
npx skills add wondelai/skills/storybrand-messaging -y
npx skills add wondelai/skills/hundred-million-offers -y
npx skills add wondelai/skills/cro-methodology -y
npx skills add wondelai/skills/obviously-awesome -y
```

### Enhance a page (copy-paste workflow)

```
Step 1: "Run a ux-heuristics audit on [page]. Score it and list issues by severity."
Step 2: "Apply refactoring-ui to [page]. Fix hierarchy, spacing, and color."
Step 3: "Apply web-typography to [page]. Fix type scale, line-height, tracking."
Step 4: "Apply top-design to [page]. Add choreographed motion and atmosphere."
Step 5: "Apply microinteractions to [page]. Add button feedback, input animations, transitions."
```
