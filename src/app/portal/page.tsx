'use client';

import Link from 'next/link';
import { Shield, LogIn, UserPlus, ArrowRight } from 'lucide-react';

export default function PortalLandingPage() {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#FAF6EE' }}>

      {/* Left panel — brand identity */}
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
            Your accommodation requests, securely online.
          </h2>
          <p className="text-base leading-relaxed" style={{ color: 'rgba(240,238,232,0.5)' }}>
            Track your case status, message your examiner, and upload documents — all in one place.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          <div
            className="h-px w-full"
            style={{ background: 'linear-gradient(to right, transparent, rgba(13,148,136,0.4), transparent)' }}
          />
          <p className="text-xs" style={{ color: 'rgba(240,238,232,0.25)' }}>
            AccommAlly &nbsp;&middot;&nbsp; Claimant Portal
          </p>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(to right, transparent, rgba(13,148,136,0.4), transparent)' }}
        />
      </div>

      {/* Right panel — actions */}
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
          <div className="mb-8">
            <h1
              className="text-3xl mb-2"
              style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#1C1A17' }}
            >
              Claimant Portal
            </h1>
            <p className="text-sm" style={{ color: '#5C5850' }}>
              Sign in to manage your accommodation requests.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/portal/login"
              className="group flex items-center justify-between w-full font-medium py-4 px-5 rounded-2xl transition-all shadow-sm"
              style={{ backgroundColor: '#0D9488', color: '#FFFFFF' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0F766E')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0D9488')}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                  <LogIn className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Sign In</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Access your existing account</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
            </Link>

            <div className="relative flex items-center gap-3 py-1">
              <div className="flex-1 h-px" style={{ backgroundColor: '#E5E2DB' }} />
              <span className="text-xs font-medium" style={{ color: '#8C8880' }}>or</span>
              <div className="flex-1 h-px" style={{ backgroundColor: '#E5E2DB' }} />
            </div>

            <Link
              href="/portal/register"
              className="group flex items-center justify-between w-full font-medium py-4 px-5 rounded-2xl border transition-all"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E2DB', color: '#1C1A17' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(13,148,136,0.08)' }}>
                  <UserPlus className="w-5 h-5" style={{ color: '#0D9488' }} />
                </div>
                <div className="text-left">
                  <p className="font-semibold" style={{ color: '#1C1A17' }}>Create Account</p>
                  <p className="text-xs" style={{ color: '#8C8880' }}>Set up portal access for the first time</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" style={{ color: '#8C8880' }} />
            </Link>
          </div>

          <p className="text-center text-xs mt-8" style={{ color: '#8C8880' }}>
            Need help? Contact your accommodation examiner directly.
          </p>
        </div>
      </div>
    </div>
  );
}
