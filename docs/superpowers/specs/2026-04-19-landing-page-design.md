# Landing Page Design — AccommAlly
**Date:** 2026-04-19

## Overview

Introduce a public-facing landing page at the root `/` that serves both existing users (front door to sign in) and potential customers (marketing). A full marketing page lives at `/about`. All existing logout/session-expired redirects that point to `/` are updated to `/login`, which becomes the dedicated login route.

## Architecture

### Route Changes

| Route | Before | After |
|-------|--------|-------|
| `/` | Login + dashboard routing (auth-aware SPA) | Static hero landing page |
| `/login` | Does not exist | Login page (moves from `/`) |
| `/about` | Does not exist | Full marketing page |

### File Changes

- `src/app/page.tsx` — Replace with `LandingPage` component (static, no auth)
- `src/app/login/page.tsx` — New file; moves existing login logic from old `page.tsx`
- `src/app/about/page.tsx` — New file; full marketing page
- `src/components/LandingPage.tsx` — New component for root hero
- `src/components/AboutPage.tsx` — New component for marketing page
- All 21 `router.push('/')` occurrences updated to `router.push('/login')`

### Auth Flow

The `/login` page retains the existing session-check-on-mount behavior: if the user already has a valid session, it redirects to `/dashboard/tasks`. The root `/` is a pure static page with no auth logic.

---

## Page 1: Root `/` — Hero Landing Page

### Layout

Full-height two-panel split, identical structure to `LoginPage.tsx`.

### Left Panel (`#1C1A17`)

- Teal radial gradient background texture (same as login)
- Shield icon + "AccommAlly" wordmark (Instrument Serif)
- Large serif headline: *"Where accommodation meets advocacy."*
- Subdued caption: `"Trusted by HR and disability teams"`
- Decorative teal gradient line at bottom

### Right Panel (`#F8F7F5`)

Content centered vertically, `max-w-sm`:

- Eyebrow label (teal `#0D9488`, small caps weight): `"Accommodation Case Management"`
- `h1` (DM Sans semibold, `#1C1A17`): `"Manage every accommodation request, end to end."`
- Body paragraph (`#5C5850`): `"AccommAlly gives HR and disability teams a secure, compliant platform to track cases, communicate with claimants, and make defensible decisions — from first request to final resolution."`
- Primary CTA button (teal fill): `"Sign In"` → `/login`
- Secondary CTA button (ghost, teal border + text): `"See how it works"` → `/about`
- Footer link at bottom of panel (`#8C8880`, small): `"For claimants, visit the portal →"` → `/request`

---

## Page 2: `/about` — Full Marketing Page

### Layout

Full-width single-column scrolling page with sticky nav. No split panel.

### Navigation

- Background: `#1C1A17`
- Left: Shield icon + "AccommAlly" wordmark (Instrument Serif, `#F0EEE8`)
- Right: `"Sign In"` teal button → `/login`
- Sticky on scroll

### Sections

#### Hero

- Background: `#F8F7F5`
- Centered content
- Instrument Serif headline (large, 2 lines): *"The accommodation platform built for the teams who care most."*
- Subheading (DM Sans, `#5C5850`): `"Secure case management, claimant portals, and compliance-ready decisions — all in one place."`
- CTAs: `"Request a Demo"` (teal fill) + `"Sign In"` (ghost)

#### Features Grid

- Background: `#FFFFFF`
- Section header: `"Everything your team needs"`
- 2×2 grid (1 column on mobile), each card has teal icon, bold title, 2-sentence description:
  1. **Case Management** — Track every request from intake to resolution. Full history, notes, and document attachments in one place.
  2. **Secure Claimant Portal** — Encrypted messaging and document exchange. Claimants access their case without needing an account.
  3. **Compliance & Audit Trail** — Full timestamped logs, WCAG-accessible, and HIPAA-aligned. Every action is recorded and exportable.
  4. **AI-Assisted Decisions** — Generate defensible accommodation decisions in seconds. Review, edit, and finalize before sending.

#### How It Works

- Background: `#F8F7F5`
- Three numbered steps in a horizontal row (stacks vertically on mobile):
  1. **Submit** — Claimant submits a request through the secure portal
  2. **Review & Communicate** — Coordinator reviews documents and communicates securely
  3. **Decide & Document** — Generate a defensible decision and close the case

#### Who It's For

- Background: `#FFFFFF`
- Two columns:
  - **HR Professionals** — Manage intake, assign coordinators, and track compliance across your organization.
  - **Disability Coordinators** — Work cases end-to-end with structured tools built for the complexity of accommodation law.

#### CTA Section

- Background: `#1C1A17` with teal radial glow (mirrors login left panel)
- Centered Instrument Serif headline: *"Ready to simplify accommodation management?"*
- Single teal `"Request a Demo"` button (links to `mailto:` or a future `/contact` route — stubbed for now)
- Secondary link (`#F0EEE8`, small): `"Already have an account? Sign in →"` → `/login`

#### Footer

- Background: `#1C1A17`
- Logo left, copyright text right (`rgba(240,238,232,0.25)`)
- Teal gradient line at the very top (mirrors login decorative line)

---

## Redirect Updates

All 21 occurrences of `router.push('/')` across the following files must change to `router.push('/login')`:

- `src/app/calendar/page.tsx` (×2)
- `src/app/calendar/layout.tsx` (×2)
- `src/app/cases/[id]/page.tsx` (×1)
- `src/app/messages/page.tsx` (×2)
- `src/app/reports/layout.tsx` (×2)
- `src/app/admin/page.tsx` (×1)
- `src/app/admin/layout.tsx` (×2)
- `src/app/dashboard/tasks/page.tsx` (×2)
- `src/app/settings/page.tsx` (×3)
- `src/app/settings/layout.tsx` (×2)
- `src/components/SessionTimeoutProvider.tsx` (×1)

---

## Design Tokens (from existing system)

| Token | Value | Usage |
|-------|-------|-------|
| `#1C1A17` | Near-black | Dark panel backgrounds, nav |
| `#F8F7F5` | Warm off-white | Light panel backgrounds |
| `#0D9488` | Teal primary | CTAs, icons, accents |
| `#0F766E` | Teal hover | Button hover states |
| `#F0EEE8` | Warm white | Text on dark panels |
| `#5C5850` | Muted brown | Secondary body text |
| `#8C8880` | Light muted | Captions, footer text |
| Instrument Serif | Display font | Headlines, wordmark |
| DM Sans | Body font | All other text |

---

## Out of Scope

- `/contact` or demo request form (CTA button stubs to `mailto:` for now)
- Animations or scroll-triggered effects
- SEO metadata beyond basic `<title>` and `<description>`
