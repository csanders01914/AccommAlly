# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public landing page at `/`, move login to `/login`, and add a full marketing page at `/about`.

**Architecture:** Create `/login/page.tsx` by extracting the existing auth logic from `page.tsx`. Replace `page.tsx` with a static hero. Add `LandingHeroPage` and `AboutPage` as standalone components. Update all 21 `router.push('/')` logout redirects to `router.push('/login')`.

**Tech Stack:** Next.js 14 App Router, React, Tailwind CSS, lucide-react, TypeScript

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/app/login/page.tsx` | Login route — session check + login/2FA form |
| Modify | `src/app/page.tsx` | Replace with static hero wrapper (no auth logic) |
| Create | `src/components/LandingHeroPage.tsx` | Root hero UI |
| Create | `src/app/about/page.tsx` | Marketing page route |
| Create | `src/components/AboutPage.tsx` | Full marketing page UI |
| Modify | `src/app/calendar/page.tsx` | `/` → `/login` (×2) |
| Modify | `src/app/calendar/layout.tsx` | `/` → `/login` (×2) |
| Modify | `src/app/cases/[id]/page.tsx` | `/` → `/login` (×1) |
| Modify | `src/app/messages/page.tsx` | `/` → `/login` (×2) |
| Modify | `src/app/reports/layout.tsx` | `/` → `/login` (×2) |
| Modify | `src/app/admin/page.tsx` | `/` → `/login` (×1) |
| Modify | `src/app/admin/layout.tsx` | `/` → `/login` (×2) |
| Modify | `src/app/dashboard/tasks/page.tsx` | `/` → `/login` (×2) |
| Modify | `src/app/settings/page.tsx` | `/` → `/login` (×3) |
| Modify | `src/app/settings/layout.tsx` | `/` → `/login` (×2) |
| Modify | `src/components/SessionTimeoutProvider.tsx` | `/` → `/login` (×1) |

---

## Task 1: Create `/login` route

Extract auth logic from the current `src/app/page.tsx` into a dedicated login route. The existing `LoginPage` component is untouched — only the route wrapper changes.

**Files:**
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: Create `src/app/login/page.tsx`**

```tsx
'use client';

import { apiFetch } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginPage } from '@/components/LoginPage';
import { Loader2 } from 'lucide-react';

export default function LoginRoute() {
  const router = useRouter();
  const [loginError, setLoginError] = useState<string | undefined>();
  const [isTwoFactor, setIsTwoFactor] = useState(false);
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await apiFetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            router.push('/dashboard/tasks');
            return;
          }
        }
      } catch (e) {
        console.error('Session check failed', e);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, [router]);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setLoginError(undefined);
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.twoFactorRequired) {
          setIsTwoFactor(true);
          setTempUserId(data.userId);
        } else {
          router.push('/dashboard/tasks');
        }
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch {
      setLoginError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (code: string) => {
    setIsLoading(true);
    setLoginError(undefined);
    try {
      const res = await apiFetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: tempUserId, token: code }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/dashboard/tasks');
      } else {
        setLoginError(data.error || 'Verification failed');
      }
    } catch {
      setLoginError('Verification error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1C1A17' }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#0D9488' }} />
      </div>
    );
  }

  return (
    <LoginPage
      onLogin={handleLogin}
      onVerify2FA={handleVerify2FA}
      isTwoFactor={isTwoFactor}
      error={loginError}
      isLoading={isLoading}
    />
  );
}
```

- [ ] **Step 2: Verify login route works**

Start the dev server (`npm run dev` from `accommally/`) and navigate to `http://localhost:3000/login`. You should see the existing login form. Confirm login with valid credentials redirects to `/dashboard/tasks`.

- [ ] **Step 3: Commit**

```bash
git add accommally/src/app/login/page.tsx
git commit -m "feat: add /login route extracted from root page"
```

---

## Task 2: Update all logout/session redirect targets from `/` to `/login`

All `router.push('/')` calls in protected pages are logout or session-expired redirects. They must point to `/login` now that the root is the landing page.

**Files:**
- Modify: `src/app/calendar/page.tsx`
- Modify: `src/app/calendar/layout.tsx`
- Modify: `src/app/cases/[id]/page.tsx`
- Modify: `src/app/messages/page.tsx`
- Modify: `src/app/reports/layout.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/app/dashboard/tasks/page.tsx`
- Modify: `src/app/settings/page.tsx`
- Modify: `src/app/settings/layout.tsx`
- Modify: `src/components/SessionTimeoutProvider.tsx`

- [ ] **Step 1: Run bulk replacement**

From the `accommally/` directory:

```bash
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i "s|router\.push('/')|router.push('/login')|g"
```

- [ ] **Step 2: Verify the replacement**

```bash
grep -rn "router\.push('/')" src/
```

Expected output: no results.

- [ ] **Step 3: Verify logout still works**

In the running dev server, log in, then trigger a logout (or wait for session timeout simulation). Confirm you land on `/login`, not `/`.

- [ ] **Step 4: Commit**

```bash
git add accommally/src/app/calendar/page.tsx \
        accommally/src/app/calendar/layout.tsx \
        accommally/src/app/cases/\[id\]/page.tsx \
        accommally/src/app/messages/page.tsx \
        accommally/src/app/reports/layout.tsx \
        accommally/src/app/admin/page.tsx \
        accommally/src/app/admin/layout.tsx \
        accommally/src/app/dashboard/tasks/page.tsx \
        accommally/src/app/settings/page.tsx \
        accommally/src/app/settings/layout.tsx \
        accommally/src/components/SessionTimeoutProvider.tsx
git commit -m "fix: redirect logout and session-expired flows to /login"
```

---

## Task 3: Create `LandingHeroPage` component

Build the hero component that renders at `/`. It is a static client component — no auth logic. Mirrors the split-panel design of `LoginPage`.

**Files:**
- Create: `src/components/LandingHeroPage.tsx`

- [ ] **Step 1: Create `src/components/LandingHeroPage.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { Shield, ArrowRight } from 'lucide-react';

export function LandingHeroPage() {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F8F7F5' }}>

      {/* Left panel — brand */}
      <div
        className="hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: '#1C1A17' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(ellipse at 30% 20%, rgba(13,148,136,0.12) 0%, transparent 55%),
                              radial-gradient(ellipse at 80% 80%, rgba(13,148,136,0.06) 0%, transparent 50%)`,
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#0D9488' }}
            >
              <Shield className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
            <span
              className="text-xl"
              style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#F0EEE8' }}
            >
              AccommAlly
            </span>
          </div>

          <h2
            className="text-4xl xl:text-5xl leading-[1.15] mb-6"
            style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#F0EEE8' }}
          >
            Where accommodation meets advocacy.
          </h2>
          <p className="text-base leading-relaxed" style={{ color: 'rgba(240,238,232,0.5)' }}>
            Trusted by HR and disability teams.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-xs" style={{ color: 'rgba(240,238,232,0.25)' }}>
            AccommAlly &nbsp;&middot;&nbsp; Accommodation Management Platform
          </p>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(to right, transparent, rgba(13,148,136,0.4), transparent)' }}
        />
      </div>

      {/* Right panel — hero content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 sm:px-12">

        {/* Mobile logo */}
        <div className="flex items-center gap-2.5 mb-10 lg:hidden">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#0D9488' }}
          >
            <Shield className="w-3.5 h-3.5 text-white" aria-hidden="true" />
          </div>
          <span
            className="text-lg"
            style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#1C1A17' }}
          >
            AccommAlly
          </span>
        </div>

        <div className="w-full max-w-sm">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: '#0D9488' }}
          >
            Accommodation Case Management
          </p>
          <h1
            className="text-2xl font-semibold leading-snug mb-4"
            style={{ color: '#1C1A17' }}
          >
            Manage every accommodation request, end to end.
          </h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: '#5C5850' }}>
            AccommAlly gives HR and disability teams a secure, compliant platform to track cases,
            communicate with claimants, and make defensible decisions — from first request to final
            resolution.
          </p>

          <div className="space-y-3">
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-150"
              style={{ backgroundColor: '#0D9488' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#0F766E')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0D9488')}
            >
              Sign In
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              href="/about"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
              style={{ border: '1px solid #0D9488', color: '#0D9488' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F0FDFA'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              See how it works
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="mt-auto pt-12">
          <Link
            href="/request"
            className="text-xs transition-colors"
            style={{ color: '#8C8880' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#5C5850')}
            onMouseLeave={e => (e.currentTarget.style.color = '#8C8880')}
          >
            For claimants, visit the portal →
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add accommally/src/components/LandingHeroPage.tsx
git commit -m "feat: add LandingHeroPage component"
```

---

## Task 4: Replace root `page.tsx` with the landing hero

Swap out the old auth-routing SPA logic with a simple static wrapper. Login now lives at `/login`.

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace `src/app/page.tsx`**

Replace the entire file contents with:

```tsx
import { LandingHeroPage } from '@/components/LandingHeroPage';

export default function Home() {
  return <LandingHeroPage />;
}
```

- [ ] **Step 2: Verify the root page**

Navigate to `http://localhost:3000/`. You should see the split-panel hero. The "Sign In" button should navigate to `/login`. The "See how it works" button should navigate to `/about` (404 for now — that's fine, comes in Task 6).

- [ ] **Step 3: Commit**

```bash
git add accommally/src/app/page.tsx
git commit -m "feat: replace root page with landing hero"
```

---

## Task 5: Create `AboutPage` component

Build the full marketing page UI. It is a static client component with no auth logic.

**Files:**
- Create: `src/components/AboutPage.tsx`

- [ ] **Step 1: Create `src/components/AboutPage.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { Shield, FolderOpen, MessageSquare, ClipboardCheck, Sparkles } from 'lucide-react';

const features = [
  {
    icon: FolderOpen,
    title: 'Case Management',
    description:
      'Track every request from intake to resolution. Full history, notes, and document attachments in one place.',
  },
  {
    icon: MessageSquare,
    title: 'Secure Claimant Portal',
    description:
      'Encrypted messaging and document exchange. Claimants access their case without needing an account.',
  },
  {
    icon: ClipboardCheck,
    title: 'Compliance & Audit Trail',
    description:
      'Full timestamped logs, WCAG-accessible, and HIPAA-aligned. Every action is recorded and exportable.',
  },
  {
    icon: Sparkles,
    title: 'AI-Assisted Decisions',
    description:
      'Generate defensible accommodation decisions in seconds. Review, edit, and finalize before sending.',
  },
] as const;

const steps = [
  {
    number: '01',
    title: 'Submit',
    description: 'Claimant submits a request through the secure portal.',
  },
  {
    number: '02',
    title: 'Review & Communicate',
    description: 'Coordinator reviews documents and communicates securely.',
  },
  {
    number: '03',
    title: 'Decide & Document',
    description: 'Generate a defensible decision and close the case.',
  },
] as const;

export function AboutPage() {
  return (
    <div style={{ backgroundColor: '#F8F7F5' }}>

      {/* Nav */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-8 py-4"
        style={{ backgroundColor: '#1C1A17' }}
      >
        <Link href="/" className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#0D9488' }}
          >
            <Shield className="w-3.5 h-3.5 text-white" aria-hidden="true" />
          </div>
          <span
            className="text-lg"
            style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#F0EEE8' }}
          >
            AccommAlly
          </span>
        </Link>
        <Link
          href="/login"
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-150"
          style={{ backgroundColor: '#0D9488' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#0F766E')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0D9488')}
        >
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <section className="py-24 px-8 text-center" style={{ backgroundColor: '#F8F7F5' }}>
        <h1
          className="text-5xl xl:text-6xl leading-[1.1] mb-6 max-w-3xl mx-auto"
          style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#1C1A17' }}
        >
          The accommodation platform built for the teams who care most.
        </h1>
        <p
          className="text-lg leading-relaxed mb-10 max-w-xl mx-auto"
          style={{ color: '#5C5850' }}
        >
          Secure case management, claimant portals, and compliance-ready decisions — all in one
          place.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a
            href="mailto:demo@accommally.com"
            className="px-6 py-3 rounded-lg text-sm font-medium text-white transition-all duration-150"
            style={{ backgroundColor: '#0D9488' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#0F766E')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0D9488')}
          >
            Request a Demo
          </a>
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg text-sm font-medium transition-all duration-150"
            style={{ border: '1px solid #0D9488', color: '#0D9488' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F0FDFA'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-8" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-3xl mb-12 text-center"
            style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#1C1A17' }}
          >
            Everything your team needs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="p-6 rounded-xl"
                style={{ border: '1px solid #E5E2DB', backgroundColor: '#FFFFFF' }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: '#F0FDFA' }}
                >
                  <Icon className="w-5 h-5" style={{ color: '#0D9488' }} aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ color: '#1C1A17' }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#5C5850' }}>
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-8" style={{ backgroundColor: '#F8F7F5' }}>
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-3xl mb-16 text-center"
            style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#1C1A17' }}
          >
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {steps.map(({ number, title, description }) => (
              <div key={number} className="text-center">
                <div
                  className="text-5xl mb-4"
                  style={{
                    fontFamily: 'var(--font-instrument-serif), Georgia, serif',
                    color: '#0D9488',
                    opacity: 0.4,
                  }}
                >
                  {number}
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ color: '#1C1A17' }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#5C5850' }}>
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-24 px-8" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-3xl mb-12 text-center"
            style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#1C1A17' }}
          >
            Who it&apos;s for
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div
              className="p-8 rounded-xl"
              style={{ backgroundColor: '#F8F7F5', border: '1px solid #E5E2DB' }}
            >
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1C1A17' }}>
                HR Professionals
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#5C5850' }}>
                Manage intake, assign coordinators, and track compliance across your organization.
                AccommAlly gives you full visibility without the administrative burden.
              </p>
            </div>
            <div
              className="p-8 rounded-xl"
              style={{ backgroundColor: '#F8F7F5', border: '1px solid #E5E2DB' }}
            >
              <h3 className="text-lg font-semibold mb-3" style={{ color: '#1C1A17' }}>
                Disability Coordinators
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: '#5C5850' }}>
                Work cases end-to-end with structured tools built for the complexity of accommodation
                law. Document every decision with confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-24 px-8 text-center relative overflow-hidden"
        style={{ backgroundColor: '#1C1A17' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(ellipse at 50% 50%, rgba(13,148,136,0.15) 0%, transparent 60%)`,
          }}
        />
        <div className="relative z-10">
          <h2
            className="text-4xl mb-8 max-w-lg mx-auto"
            style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#F0EEE8' }}
          >
            Ready to simplify accommodation management?
          </h2>
          <a
            href="mailto:demo@accommally.com"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium text-white mb-6 transition-all duration-150"
            style={{ backgroundColor: '#0D9488' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#0F766E')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0D9488')}
          >
            Request a Demo
          </a>
          <p className="text-sm">
            <Link
              href="/login"
              className="transition-colors"
              style={{ color: 'rgba(240,238,232,0.5)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(240,238,232,0.8)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,238,232,0.5)')}
            >
              Already have an account? Sign in →
            </Link>
          </p>
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(to right, transparent, rgba(13,148,136,0.4), transparent)' }}
        />
      </section>

      {/* Footer */}
      <footer
        className="flex items-center justify-between px-8 py-6 relative"
        style={{ backgroundColor: '#1C1A17' }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(to right, transparent, rgba(13,148,136,0.4), transparent)' }}
        />
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ backgroundColor: '#0D9488' }}
          >
            <Shield className="w-3 h-3 text-white" aria-hidden="true" />
          </div>
          <span
            className="text-base"
            style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#F0EEE8' }}
          >
            AccommAlly
          </span>
        </Link>
        <p className="text-xs" style={{ color: 'rgba(240,238,232,0.25)' }}>
          © {new Date().getFullYear()} AccommAlly. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add accommally/src/components/AboutPage.tsx
git commit -m "feat: add AboutPage marketing component"
```

---

## Task 6: Create `/about` route

Wire the `AboutPage` component into the Next.js App Router.

**Files:**
- Create: `src/app/about/page.tsx`

- [ ] **Step 1: Create `src/app/about/page.tsx`**

```tsx
import { AboutPage } from '@/components/AboutPage';

export const metadata = {
  title: 'AccommAlly — Accommodation Case Management',
  description:
    'Secure case management, claimant portals, and compliance-ready decisions for HR and disability teams.',
};

export default function AboutRoute() {
  return <AboutPage />;
}
```

- [ ] **Step 2: Verify the full flow**

Navigate to `http://localhost:3000/`:
- Left panel shows "Where accommodation meets advocacy."
- "Sign In" button goes to `/login`
- "See how it works" goes to `/about`
- `/about` shows nav, hero, features grid, how it works, who it's for, CTA section, footer
- "Request a Demo" opens a `mailto:` link
- "Already have an account? Sign in →" goes to `/login`
- Footer logo links back to `/`
- Logging in from `/login` redirects to `/dashboard/tasks`

- [ ] **Step 3: Commit**

```bash
git add accommally/src/app/about/page.tsx
git commit -m "feat: add /about marketing page route"
```
