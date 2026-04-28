'use client';

import { apiFetch } from '@/lib/api-client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Mail, Lock, ArrowRight, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await apiFetch('/api/public/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push('/portal/dashboard');
      } else {
        const data = await res.json();
        setError(data.error || 'Login failed. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#FAF6EE' }}>

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
          <Link href="/portal" className="flex items-center gap-3 mb-16 group">
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
            Welcome back.
          </h2>
          <p className="text-base leading-relaxed" style={{ color: 'rgba(240,238,232,0.5)' }}>
            Sign in to view your case status, messages, and documents.
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

      {/* Right panel — form */}
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
              Sign In
            </h1>
            <p className="text-sm" style={{ color: '#5C5850' }}>
              AccommAlly Claimant Portal
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3 rounded-xl text-sm flex items-center gap-2" style={{ backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: '#DC2626' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: '#1C1A17' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#8C8880' }} aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-all"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E2DB',
                    color: '#1C1A17',
                  }}
                  onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 2px #115E59')}
                  onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl pl-10 pr-4 py-3 text-sm outline-none transition-all"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E2DB',
                    color: '#1C1A17',
                  }}
                  onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 2px #115E59')}
                  onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full font-medium py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: '#0D9488', color: '#FFFFFF' }}
              onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#0F766E')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0D9488')}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 text-center space-y-3" style={{ borderTop: '1px solid #E5E2DB' }}>
            <p className="text-sm" style={{ color: '#5C5850' }}>
              Don&apos;t have an account yet?{' '}
              <Link href="/portal/register" className="font-medium transition-colors" style={{ color: '#0D9488' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#0F766E')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#0D9488')}
              >
                Create one
              </Link>
            </p>
            <Link
              href="/portal"
              className="inline-flex items-center gap-1 text-xs transition-colors"
              style={{ color: '#8C8880' }}
            >
              <ArrowLeft className="w-3 h-3" /> Back to portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
