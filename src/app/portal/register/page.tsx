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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-surface border border-border rounded-3xl p-10 shadow-xl">
          <div className="inline-flex p-3 rounded-2xl bg-green-500/10 mb-4 ring-1 ring-green-500/20">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Account Created!</h2>
          <p className="text-text-secondary text-sm mb-6">
            Your portal account has been set up. You&apos;ll be redirected to sign in shortly.
          </p>
          <Link
            href="/portal/login"
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-medium px-6 py-3 rounded-xl transition-all"
          >
            Sign In Now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-10">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDF6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />

      <div className="max-w-md w-full relative">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-primary-500/10 mb-4 ring-1 ring-[#0D9488]/20">
            <Shield className="w-8 h-8 text-primary-500" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Create Your Account</h1>
          <p className="text-text-secondary text-sm mt-2">
            You&apos;ll need the organization code from your employer
          </p>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-8 shadow-xl">
          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Organization */}
            <div>
              <label htmlFor="organizationCode" className="block text-sm font-medium text-text-primary mb-2">
                Organization Code
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" aria-hidden="true" />
                <input
                  id="organizationCode"
                  type="text"
                  value={form.organizationCode}
                  onChange={set('organizationCode')}
                  placeholder="e.g. acme-corp"
                  className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-text-primary outline-none focus:ring-2 focus:ring-[#0D9488] transition-all placeholder-text-muted"
                  required
                  autoComplete="organization"
                />
              </div>
              <p className="mt-1.5 text-xs text-text-muted">
                Provided by your employer or HR department.
              </p>
            </div>

            {/* Name */}
            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Your Information
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-text-primary mb-2">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" aria-hidden="true" />
                    <input
                      id="firstName"
                      type="text"
                      value={form.firstName}
                      onChange={set('firstName')}
                      placeholder="Jane"
                      className="w-full bg-surface border border-border rounded-xl pl-10 pr-3 py-3 text-text-primary outline-none focus:ring-2 focus:ring-[#0D9488] transition-all placeholder-text-muted"
                      required
                      autoComplete="given-name"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-text-primary mb-2">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={form.lastName}
                    onChange={set('lastName')}
                    placeholder="Smith"
                    className="w-full bg-surface border border-border rounded-xl px-3 py-3 text-text-primary outline-none focus:ring-2 focus:ring-[#0D9488] transition-all placeholder-text-muted"
                    required
                    autoComplete="family-name"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="birthdate" className="block text-sm font-medium text-text-primary mb-2">
                Date of Birth
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" aria-hidden="true" />
                <input
                  id="birthdate"
                  type="date"
                  value={form.birthdate}
                  onChange={set('birthdate')}
                  className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-text-primary outline-none focus:ring-2 focus:ring-[#0D9488] transition-all"
                  required
                />
              </div>
            </div>

            {/* Credentials */}
            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Account Credentials
              </p>

              <div className="space-y-3">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" aria-hidden="true" />
                    <input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={set('email')}
                      placeholder="you@example.com"
                      className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-text-primary outline-none focus:ring-2 focus:ring-[#0D9488] transition-all placeholder-text-muted"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" aria-hidden="true" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={set('password')}
                      placeholder="At least 8 characters"
                      className="w-full bg-surface border border-border rounded-xl pl-10 pr-10 py-3 text-text-primary outline-none focus:ring-2 focus:ring-[#0D9488] transition-all placeholder-text-muted"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" aria-hidden="true" />
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={set('confirmPassword')}
                      placeholder="Re-enter your password"
                      className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-text-primary outline-none focus:ring-2 focus:ring-[#0D9488] transition-all placeholder-text-muted"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* PIN */}
            <div className="border-t border-border pt-4">
              <label htmlFor="pin" className="block text-sm font-medium text-text-primary mb-2">
                Phone Verification PIN
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" aria-hidden="true" />
                <input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.pin}
                  onChange={set('pin')}
                  placeholder="4–6 digit PIN"
                  className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-text-primary outline-none focus:ring-2 focus:ring-[#0D9488] transition-all placeholder-text-muted"
                  required
                />
              </div>
              <p className="mt-2 text-xs text-text-muted leading-relaxed">
                Choose a 4–6 digit PIN. When you call in, your examiner will ask for this to verify your identity. Do not share it with anyone.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Create Account <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-sm text-text-secondary">
              Already have an account?{' '}
              <Link href="/portal/login" className="text-primary-500 hover:text-primary-600 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/portal"
            className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Back
          </Link>
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
