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
              Already have an account? Sign in <span aria-hidden="true">→</span>
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
        <Link href="/" className="flex items-center gap-2.5" aria-label="AccommAlly — back to home">
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
