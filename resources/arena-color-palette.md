# Arena Mobile App Color Palette

Extracted from: https://arenaappmobiledevonboarding.netlify.app/

---

## Brand Identity

- **Logo**: Teal hexagon icon with inner cube shape
- **Tagline**: "THE NEW WAY TO PLAY"
- **Typography**: Clean sans-serif, uppercase for headings, bold "FIND. BOOK. PLAY." hero text
- **Background**: Stadium photography with dark overlays

---

## Primary Colors

| Name                 | Hex       | RGB                 | Usage                                     |
| -------------------- | --------- | ------------------- | ----------------------------------------- |
| **Arena Teal**       | `#00C4AD` | `rgb(0, 196, 173)`  | Primary brand, logo, CTA buttons, accents |
| **Arena Teal Dark**  | `#00A894` | `rgb(0, 168, 148)`  | Hover states, gradient end                |
| **Arena Teal Light** | `#00E5CC` | `rgba(0, 229, 204)` | Grid lines, subtle highlights             |

### CSS Variables (from the app)

```css
--green: #00c4ad;
--teal: #00a894;
--text: #0b0f14;
```

---

## Neutral Colors

| Name              | Hex       | RGB                         | Usage                              |
| ----------------- | --------- | --------------------------- | ---------------------------------- |
| **Near Black**    | `#0B0F14` | `rgb(11, 15, 20)`           | Primary text, dark backgrounds     |
| **Dark Charcoal** | `#0D0D0D` | `rgb(13, 13, 13)`           | Overlay backgrounds, vignette      |
| **White**         | `#FFFFFF` | `rgb(255, 255, 255)`        | Headings on dark, card backgrounds |
| **White 90%**     | —         | `rgba(255, 255, 255, 0.9)`  | Primary text on dark               |
| **White 82%**     | —         | `rgba(255, 255, 255, 0.82)` | Body text on dark                  |
| **White 72%**     | —         | `rgba(255, 255, 255, 0.72)` | Secondary text on dark             |
| **White 60%**     | —         | `rgba(255, 255, 255, 0.6)`  | Muted text on dark                 |
| **White 35%**     | —         | `rgba(255, 255, 255, 0.35)` | Disabled/hint text                 |
| **White 20%**     | —         | `rgba(255, 255, 255, 0.2)`  | Borders, dividers on dark          |
| **Gray 500**      | `#999DA5` | `rgb(153, 157, 165)`        | Secondary text, icons              |
| **Gray 600**      | `#62666E` | `rgb(98, 102, 110)`         | Muted labels                       |
| **Gray 700**      | `#4B5563` | `rgb(75, 85, 99)`           | Tertiary text                      |

---

## Accent / Status Colors

| Name               | Hex       | RGB                       | Usage                     |
| ------------------ | --------- | ------------------------- | ------------------------- |
| **Amber / Gold**   | `#E09920` | `rgb(224, 153, 32)`       | Warnings, highlights      |
| **Amber Light**    | —         | `rgba(255, 180, 50, 0.9)` | Premium/featured badges   |
| **Amber Muted**    | —         | `rgba(255, 180, 50, 0.1)` | Amber background tint     |
| **WhatsApp Green** | `#25D366` | `rgb(37, 211, 102)`       | WhatsApp integration      |
| **Red Error**      | `#DC2626` | `rgb(220, 38, 38)`        | Error states, destructive |
| **Red Brand**      | `#EE161F` | `rgb(238, 22, 31)`        | Alert/urgent indicators   |
| **Blue Accent**    | —         | `rgba(91, 143, 255, 0.9)` | Info, links               |

---

## Surface Colors (Light Mode)

| Name              | Hex       | RGB                   | Usage                            |
| ----------------- | --------- | --------------------- | -------------------------------- |
| **Background**    | `#F5F4F2` | `rgb(245, 244, 242)`  | Page background (warm off-white) |
| **Card**          | `#FFFFFF` | `rgb(255, 255, 255)`  | Card surfaces                    |
| **Teal Surface**  | `#E4FBF8` | `rgb(228, 251, 248)`  | Teal tinted background           |
| **Muted Surface** | `#EDECE8` | `rgb(237, 236, 232)`  | Secondary surface, skeletons     |
| **Divider**       | —         | `rgba(0, 0, 0, 0.07)` | Borders and dividers             |

---

## Key Gradients

### Stadium Overlay (Hero)

```css
/* Dark vignette over stadium photo */
radial-gradient(at 50% 38%, transparent 28%, rgba(13,13,13,0.72) 70%, rgba(13,13,13,0.95) 100%)
```

### Bottom Fade

```css
/* Fade to black at bottom of hero */
linear-gradient(to top, rgb(13,13,13) 0%, rgba(13,13,13,0.88) 50%, transparent 100%)
```

### Teal CTA Button

```css
/* Primary button gradient */
linear-gradient(135deg, #00C4AD, #00A894)
```

### Teal Subtle Glow

```css
/* Subtle teal ambient on dark surfaces */
linear-gradient(rgba(0,196,173,0.07) 0%, rgba(0,196,173,0.02) 55%, transparent 100%)
```

### Teal Grid Pattern

```css
/* Subtle grid texture on dark backgrounds */
linear-gradient(rgba(0,229,204,0.04) 1px, transparent 1px),
linear-gradient(90deg, rgba(0,229,204,0.04) 1px, transparent 1px)
```

### Dark Overlay

```css
/* Content overlay on images */
radial-gradient(100% 70% at 50% 20%, rgba(6,26,24,0.6) 0%, rgba(4,18,16,0.25) 40%, transparent 70%)
```

---

## Typography

- **Headings**: Bold, uppercase, large scale (e.g., "FIND. BOOK. PLAY.")
- **Tagline**: Uppercase, letter-spaced, light weight ("THE NEW WAY TO PLAY")
- **Body**: Regular weight, high opacity on dark backgrounds
- **Labels**: Uppercase tracking for form labels

---

## Design Patterns Observed

1. **Stadium photography** as hero/background with dark gradient overlay
2. **Teal as sole accent** -- no secondary brand color, teal carries everything
3. **High contrast text** -- white text at varying opacities for hierarchy
4. **Warm neutrals** -- the off-white (#F5F4F2) and warm grays (#EDECE8) in light sections
5. **Gradient overlays** -- multiple layered gradients for depth on photos
6. **Grid texture** -- faint teal grid lines on dark surfaces for subtle tech feel
7. **Vignette effect** -- radial gradient darkening edges of stadium photos

---

## Mapping to Admin Dashboard

### Current Admin Theme → Updated with Arena Colors

| Admin Token            | Current (Gold/Amber)               | Arena-Aligned                                        |
| ---------------------- | ---------------------------------- | ---------------------------------------------------- |
| `--primary`            | `oklch(0.78 0.16 75)` gold         | `#00C4AD` arena teal                                 |
| `--primary-foreground` | `oklch(0.13 0.01 75)`              | `#0B0F14` near-black                                 |
| `--background` (dark)  | `oklch(0.115 0.005 285)` blue-tint | `#0B0F14` warm dark                                  |
| `--card` (dark)        | `oklch(0.155 0.005 285)`           | `#141819` slightly lighter                           |
| `--ring`               | gold                               | `#00C4AD` teal                                       |
| `--gold`               | gold                               | Rename to `--arena` or keep gold as secondary accent |
| Accent glow            | Gold ambient                       | Teal ambient                                         |
| Grid texture           | White lines                        | Teal lines (matching mobile app)                     |

### Recommendation

**Option A: Full rebrand to teal** -- Replace gold/amber with Arena teal throughout. Dashboard matches mobile app exactly.

**Option B: Teal primary + gold secondary** -- Teal for CTAs and accents, keep gold/amber as a warm secondary for status badges, warnings, and premium indicators. This gives the admin dashboard its own identity while staying in the Arena family.

**Option B is recommended** -- the admin portal benefits from having a warm accent (gold) alongside the brand teal, since dashboards need more color range for data visualization and status indicators than a mobile app.
