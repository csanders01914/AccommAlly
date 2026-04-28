'use client';

import { apiFetch } from '@/lib/api-client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  LogOut,
  FilePlus,
  FolderSearch,
  MessageSquare,
  Upload,
  Loader2,
  ArrowRight,
} from 'lucide-react';

interface ClaimantInfo {
  name: string;
  claimantNumber: string;
}

export default function PortalDashboard() {
  const router = useRouter();
  const [claimant, setClaimant] = useState<ClaimantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/public/portal/me')
      .then(async (res) => {
        if (res.status === 401) {
          router.push('/portal/login');
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setClaimant(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await apiFetch('/api/public/portal/logout', { method: 'POST' });
    router.push('/portal');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF6EE' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0D9488' }} />
      </div>
    );
  }

  const firstName = claimant?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF6EE' }}>

      {/* ── Dark hero zone (header + welcome, seamlessly joined) ── */}
      <div className="relative overflow-hidden" style={{ backgroundColor: '#1C1A17' }}>

        {/* Radial teal ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(ellipse at 15% 50%, rgba(13,148,136,0.14) 0%, transparent 55%),
              radial-gradient(ellipse at 85% 10%, rgba(13,148,136,0.07) 0%, transparent 45%)
            `,
          }}
        />

        {/* Header */}
        <header className="sticky top-0 z-10 relative" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#0D9488' }}
              >
                <Shield className="w-3.5 h-3.5 text-white" aria-hidden="true" />
              </div>
              <span
                className="text-base"
                style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#F0EEE8' }}
              >
                AccommAlly
              </span>
            </div>
            <div className="flex items-center gap-5">
              {claimant && (
                <span
                  className="text-xs hidden sm:block px-2.5 py-1 rounded-full"
                  style={{
                    color: 'rgba(240,238,232,0.5)',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  #{claimant.claimantNumber}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="text-sm flex items-center gap-1.5 transition-colors"
                style={{ color: 'rgba(240,238,232,0.45)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#F0EEE8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(240,238,232,0.45)')}
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Welcome section */}
        <div className="relative max-w-4xl mx-auto px-6 pt-10 pb-14">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-3"
            style={{ color: 'rgba(13,148,136,0.85)' }}
          >
            Your Portal
          </p>
          <h1
            className="text-5xl sm:text-6xl leading-[1.08] mb-4"
            style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#F0EEE8' }}
          >
            Welcome back,<br />{firstName}.
          </h1>
          <p className="text-sm" style={{ color: 'rgba(240,238,232,0.4)' }}>
            Manage your accommodation requests securely below.
          </p>
        </div>

        {/* Teal gradient fade-out at the bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(to right, transparent, rgba(13,148,136,0.5), transparent)' }}
        />
      </div>

      {/* ── Content zone ── */}
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-4">

        {/* Primary CTA — File a New Claim */}
        <Link
          href="/portal/dashboard/new-claim"
          className="group relative flex items-center justify-between w-full overflow-hidden rounded-2xl px-7 py-6 transition-all"
          style={{
            backgroundColor: '#0D9488',
            boxShadow: '0 4px 24px rgba(13,148,136,0.25)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#0F766E';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(13,148,136,0.35)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#0D9488';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(13,148,136,0.25)';
          }}
        >
          {/* Subtle inner shimmer */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(ellipse at 90% 50%, rgba(255,255,255,0.07) 0%, transparent 60%)',
            }}
          />

          <div className="relative flex items-center gap-5">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
            >
              <FilePlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <p
                className="text-lg font-semibold text-white"
                style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
              >
                File a New Claim
              </p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Submit a workplace accommodation request
              </p>
            </div>
          </div>
          <ArrowRight
            className="relative w-5 h-5 text-white opacity-60 group-hover:translate-x-1 group-hover:opacity-100 transition-all flex-shrink-0"
          />
        </Link>

        {/* Secondary actions grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SecondaryCard
            href="/portal/dashboard/claims"
            icon={<FolderSearch className="w-5 h-5" />}
            title="View My Claims"
            description="Review status and details"
          />
          <SecondaryCard
            href="/portal/dashboard/claims?tab=messages"
            icon={<MessageSquare className="w-5 h-5" />}
            title="Messages"
            description="Communicate with your examiner"
          />
          <SecondaryCard
            href="/portal/dashboard/claims?tab=documents"
            icon={<Upload className="w-5 h-5" />}
            title="Documents"
            description="Upload supporting files"
          />
        </div>

        {/* Footer note */}
        <p className="text-center text-xs pt-2" style={{ color: '#8C8880' }}>
          All activity is encrypted and confidential.
        </p>
      </main>
    </div>
  );
}

interface SecondaryCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function SecondaryCard({ href, icon, title, description }: SecondaryCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 p-5 rounded-2xl transition-all"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E2DB',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(13,148,136,0.28)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.07)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = '#E5E2DB';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: '#FAF6EE', color: '#0D9488' }}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold mb-0.5" style={{ color: '#1C1A17' }}>{title}</p>
        <p className="text-xs leading-relaxed" style={{ color: '#8C8880' }}>{description}</p>
      </div>
    </Link>
  );
}
