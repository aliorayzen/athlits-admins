# Athlits Admin — Product Context

> Context file for the `impeccable` design skill. Defines who we serve, the
> brand register, and the strategic principles every UI decision answers to.
> Pairs with [DESIGN.md](./DESIGN.md), which holds the concrete tokens.

register: product

## Product purpose

Athlits Admin is the **internal admin dashboard** for the Athlits sports-venue
booking platform. It is an operations tool: staff use it to manage venues,
courts, bookings, invoices, contracts, and platform users. It is a Next.js 15
frontend talking to a Spring Boot backend; admins authenticate with an emailed
one-time code (OTP), venue managers with email + a temporary password.

This is a **product** surface, not a marketing surface. Design _serves_ the
work — it earns its keep through clarity, speed, and trust, not spectacle.

## Users

- **Platform admins** — internal operators with platform-wide access. They live
  in this tool daily, move fast, and care about density, scannability, and not
  being slowed down. Power users: expose keyboard paths and shortcuts.
- **Venue managers (VMs)** — scoped to their assigned venues; manage courts,
  pricing, bookings, and invoices for those venues only.

Both are repeat, expert users performing high-stakes operational tasks
(money, access, scheduling). Optimize for the hundredth use, not the first.

## Brand & tone

**Dark luxury, operational.** Premium but restrained — confident, precise,
quiet. The feel is a well-machined instrument: deep blue-zinc surfaces, a
disciplined gold/amber + teal accent system, generous type contrast, and
motion that clarifies rather than performs. Trustworthy and legible above all.

Voice in UI copy: direct, calm, specific. Say what happened and what to do
next. No cute filler, no exclamation marks, no jargon the operator must decode.

## Anti-references (what we are NOT)

- Generic SaaS dashboard template — sidebar + uniform card grid + stock charts.
- Unmodified shadcn/ui defaults passed off as finished design.
- Flat gray-on-white admin panels with one lonely accent color.
- Rainbow / default chart palettes that ignore the semantic color system.
- Playful consumer styling, oversized hero art, decorative gradients with no job.
- Dark mode "because tools look cool dark" — our dark is a deliberate, tuned
  surface system, not a reflexive default.

## Strategic principles

1. **Density with hierarchy.** Show a lot, but rank it. Scale, weight, and
   color do the ranking — never uniform emphasis.
2. **Semantic color is law.** Teal = primary / admin identity. Amber/gold =
   venue-manager identity, warnings, money-at-risk. Green/red/blue carry their
   conventional meanings. Color means something; it is not decoration.
3. **Keyboard-first.** Operators submit with ⌘/Ctrl+Enter, expect focus rings,
   labelled inputs, and predictable tab order. Accessibility is non-negotiable.
4. **Dark-first, light-capable.** The dark theme is the primary canvas; the
   light theme must feel equally intentional, not an afterthought.
5. **Reuse the system.** New surfaces compose existing tokens, primitives, and
   scoped patterns — they do not invent one-off colors, radii, or shadows.
6. **Restraint is the brand.** When in doubt, quieter. Luxury here reads as
   precision and confidence, not ornament.
