'use client';

import { apiFetch } from '@/lib/api-client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  Building2,
  User,
  Mail,
  Lock,
  KeyRound,
  Calendar,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Eye,
  EyeOff,
} from 'lucide-react';

const inputStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E2DB',
  color: '#1C1A17',
};

const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 2px #115E59';
};
const inputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
};

function PortalRegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    organizationCode: searchParams.get('org') ?? '',
    firstName: '',
    lastName: '',
    birthdate: '',
    email: '',
    password: '',
    confirmPassword: '',
    pin: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/^\d{4,6}$/.test(form.pin)) {
      setError('PIN must be 4–6 digits.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiFetch('/api/public/portal/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/portal/login'), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Registration failed. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#FAF6EE' }}>
        <div
          className="max-w-md w-full text-center rounded-3xl p-10 shadow-xl"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB' }}
        >
          <div
            className="inline-flex p-3 rounded-2xl mb-4"
            style={{ backgroundColor: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)' }}
          >
            <CheckCircle className="w-8 h-8" style={{ color: '#059669' }} />
          </div>
          <h2
            className="text-2xl mb-2"
            style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#1C1A17' }}
          >
            Account Created!
          </h2>
          <p className="text-sm mb-6" style={{ color: '#5C5850' }}>
            Your portal account has been set up. You&apos;ll be redirected to sign in shortly.
          </p>
          <Link
            href="/portal/login"
            className="inline-flex items-center gap-2 font-medium px-6 py-3 rounded-xl transition-all"
            style={{ backgroundColor: '#0D9488', color: '#FFFFFF' }}
          >
            Sign In Now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#FAF6EE' }}>

      {/* Left panel — brand */}
      <div
        className="hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col justify-between p-12 relative overflow-hidden sticky top-0 h-screen"
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
          <Link href="/portal" className="flex items-center gap-3 mb-16">
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
          </Link>

          <h2
            className="text-4xl xl:text-5xl leading-[1.15] mb-6"
            style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#F0EEE8' }}
          >
            Create your account.
          </h2>
          <p className="text-base leading-relaxed" style={{ color: 'rgba(240,238,232,0.5)' }}>
            You&apos;ll need the organization code provided by your employer or HR department.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-xs" style={{ color: 'rgba(240,238,232,0.25)' }}>
            AccommAlly &nbsp;&middot;&nbsp; Claimant Portal
          </p>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(to right, transparent, rgba(13,148,136,0.4), transparent)' }}
        />
      </div>

      {/* Right panel — scrollable form */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-6 py-12 sm:px-12 min-h-full">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden self-start">
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
                Create Your Account
              </h1>
              <p className="text-sm" style={{ color: '#5C5850' }}>
                You&apos;ll need your organization code to get started.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-5">
              {error && (
                <div
                  className="p-3 rounded-xl text-sm flex items-center gap-2"
                  style={{ backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: '#DC2626' }}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Organization */}
              <div>
                <label htmlFor="organizationCode" className="block text-sm font-medium mb-2" style={{ color: '#1C1A17' }}>
                  Organization Code
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#8C8880' }} aria-hidden="true" />
                  <input
                    id="organizationCode"
                    type="text"
                    value={form.organizationCode}
                    onChange={set('organizationCode')}
                    placeholder="e.g. acme-corp"
                    className="w-full rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-all"
                    style={inputStyle}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                    required
                    autoComplete="organization"
                  />
                </div>
                <p className="mt-1.5 text-xs" style={{ color: '#8C8880' }}>
                  Provided by your employer or HR department.
                </p>
              </div>

              {/* Name */}
              <div style={{ borderTop: '1px solid #E5E2DB', paddingTop: '1rem' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#8C8880' }}>
                  Your Information
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium mb-2" style={{ color: '#1C1A17' }}>
                      First Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#8C8880' }} aria-hidden="true" />
                      <input
                        id="firstName"
                        type="text"
                        value={form.firstName}
                        onChange={set('firstName')}
                        placeholder="Jane"
                        className="w-full rounded-xl pl-10 pr-3 py-3 text-sm outline-none transition-all"
                        style={inputStyle}
                        onFocus={inputFocus}
                        onBlur={inputBlur}
                        required
                        autoComplete="given-name"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium mb-2" style={{ color: '#1C1A17' }}>
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={form.lastName}
                      onChange={set('lastName')}
                      placeholder="Smith"
                      className="w-full rounded-xl px-3 py-3 text-sm outline-none transition-all"
                      style={inputStyle}
                      onFocus={inputFocus}
                      onBlur={inputBlur}
                      required
                      autoComplete="family-name"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="birthdate" className="block text-sm font-medium mb-2" style={{ color: '#1C1A17' }}>
                  Date of Birth
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#8C8880' }} aria-hidden="true" />
                  <input
                    id="birthdate"
                    type="date"
                    value={form.birthdate}
                    onChange={set('birthdate')}
                    className="w-full rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-all"
                    style={inputStyle}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                    required
                  />
                </div>
              </div>

              {/* Credentials */}
              <div style={{ borderTop: '1px solid #E5E2DB', paddingTop: '1rem' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#8C8880' }}>
                  Account Credentials
                </p>

                <div className="space-y-3">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: '#1C1A17' }}>
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#8C8880' }} aria-hidden="true" />
                      <input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={set('email')}
                        placeholder="you@example.com"
                        className="w-full rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-all"
                        style={inputStyle}
                        onFocus={inputFocus}
                        onBlur={inputBlur}
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: '#1C1A17' }}>
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#8C8880' }} aria-hidden="true" />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={set('password')}
                        placeholder="At least 8 characters"
                        className="w-full rounded-xl pl-10 pr-10 py-3 text-sm outline-none transition-all"
                        style={inputStyle}
                        onFocus={inputFocus}
                        onBlur={inputBlur}
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                        style={{ color: '#8C8880' }}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2" style={{ color: '#1C1A17' }}>
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#8C8880' }} aria-hidden="true" />
                      <input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={form.confirmPassword}
                        onChange={set('confirmPassword')}
                        placeholder="Re-enter your password"
                        className="w-full rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-all"
                        style={inputStyle}
                        onFocus={inputFocus}
                        onBlur={inputBlur}
                        required
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* PIN */}
              <div style={{ borderTop: '1px solid #E5E2DB', paddingTop: '1rem' }}>
                <label htmlFor="pin" className="block text-sm font-medium mb-2" style={{ color: '#1C1A17' }}>
                  Phone Verification PIN
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#8C8880' }} aria-hidden="true" />
                  <input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.pin}
                    onChange={set('pin')}
                    placeholder="4–6 digit PIN"
                    className="w-full rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-all"
                    style={inputStyle}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                    required
                  />
                </div>
                <p className="mt-2 text-xs leading-relaxed" style={{ color: '#8C8880' }}>
                  Choose a 4–6 digit PIN. Your examiner will use this to verify your identity by phone. Do not share it.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full font-medium py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                style={{ backgroundColor: '#0D9488', color: '#FFFFFF' }}
                onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#0F766E')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0D9488')}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>Create Account <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 text-center space-y-3" style={{ borderTop: '1px solid #E5E2DB' }}>
              <p className="text-sm" style={{ color: '#5C5850' }}>
                Already have an account?{' '}
                <Link href="/portal/login" className="font-medium" style={{ color: '#0D9488' }}>
                  Sign in
                </Link>
              </p>
              <Link
                href="/portal"
                className="inline-flex items-center gap-1 text-xs"
                style={{ color: '#8C8880' }}
              >
                <ArrowLeft className="w-3 h-3" /> Back to portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PortalRegisterPage() {
  return (
    <Suspense>
      <PortalRegisterPageInner />
    </Suspense>
  );
}
