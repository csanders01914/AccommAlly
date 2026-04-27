'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, LogIn, UserPlus, ArrowRight, Loader2, AlertCircle, Lock } from 'lucide-react';

interface TenantInfo {
  name: string;
  slug: string;
}

export default function OrgLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/public/tenant/${slug}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => { if (data) setTenant(data); })
      .catch(() => setNotFound(true));
  }, [slug]);

  if (!tenant && !notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-text-primary mb-2">Organization not found</h1>
          <p className="text-sm text-text-secondary mb-6">
            <span className="font-mono bg-surface border border-border px-2 py-0.5 rounded text-xs">{slug}</span>{' '}
            does not match any active organization.
          </p>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-primary-500 hover:text-primary-600 font-medium transition-colors"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-primary-500/10 mb-4 ring-1 ring-primary-500/20">
            <Shield className="w-8 h-8 text-primary-500" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">{tenant!.name}</h1>
          <p className="text-text-secondary text-sm mt-1">AccommAlly — Accommodation Management</p>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-8 shadow-xl space-y-3">
          {/* Staff login */}
          <Link
            href="/login"
            className="flex items-center justify-between w-full bg-surface border border-border hover:bg-surface-raised text-text-primary font-medium py-4 px-5 rounded-2xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-primary-500" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-text-primary text-sm">Staff Sign In</p>
                <p className="text-xs text-text-muted">Examiners and coordinators</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-text-muted opacity-50 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
          </Link>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-text-muted font-medium">claimant portal</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Claimant portal sign in */}
          <Link
            href="/portal/login"
            className="flex items-center justify-between w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-4 px-5 rounded-2xl transition-all shadow-md group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <LogIn className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Claimant Sign In</p>
                <p className="text-xs text-white/70">Access your accommodation requests</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Register — pass slug as org code */}
          <Link
            href={`/portal/register?org=${slug}`}
            className="flex items-center justify-between w-full bg-surface border border-border hover:bg-surface-raised text-text-primary font-medium py-4 px-5 rounded-2xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-4 h-4 text-primary-500" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-text-primary text-sm">Create Claimant Account</p>
                <p className="text-xs text-text-muted">First-time portal registration</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-text-muted opacity-50 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
          </Link>
        </div>

        <p className="text-center text-text-muted text-xs mt-6">
          Organization code:{' '}
          <span className="font-mono bg-surface border border-border px-1.5 py-0.5 rounded text-xs">{slug}</span>
        </p>
      </div>
    </div>
  );
}
