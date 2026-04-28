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
  ChevronRight,
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
      {/* Dark branded header */}
      <header className="sticky top-0 z-10" style={{ backgroundColor: '#1C1A17', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
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
          <div className="flex items-center gap-4">
            {claimant && (
              <span className="text-xs hidden sm:block" style={{ color: 'rgba(240,238,232,0.4)' }}>
                Claimant #{claimant.claimantNumber}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="text-sm flex items-center gap-1.5 transition-colors"
              style={{ color: 'rgba(240,238,232,0.55)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F0EEE8')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(240,238,232,0.55)')}
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-10">
          <h1
            className="text-4xl mb-1"
            style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#1C1A17' }}
          >
            Welcome back, {firstName}.
          </h1>
          <p className="text-sm" style={{ color: '#5C5850' }}>What would you like to do today?</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ActionCard
            href="/portal/dashboard/new-claim"
            icon={<FilePlus className="w-6 h-6" />}
            iconColor="#0D9488"
            iconBgColor="rgba(13,148,136,0.08)"
            title="File a New Claim"
            description="Submit a new accommodation request to your organization"
          />
          <ActionCard
            href="/portal/dashboard/claims"
            icon={<FolderSearch className="w-6 h-6" />}
            iconColor="#2563EB"
            iconBgColor="rgba(37,99,235,0.08)"
            title="View My Claims"
            description="Review the status and details of your existing claims"
          />
          <ActionCard
            href="/portal/dashboard/claims?tab=messages"
            icon={<MessageSquare className="w-6 h-6" />}
            iconColor="#7C3AED"
            iconBgColor="rgba(124,58,237,0.08)"
            title="Message My Examiner"
            description="Send or review messages with your assigned examiner"
          />
          <ActionCard
            href="/portal/dashboard/claims?tab=documents"
            icon={<Upload className="w-6 h-6" />}
            iconColor="#D97706"
            iconBgColor="rgba(217,119,6,0.08)"
            title="Upload Documents"
            description="Add supporting documents to one of your claims"
          />
        </div>
      </main>
    </div>
  );
}

interface ActionCardProps {
  href: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBgColor: string;
  title: string;
  description: string;
}

function ActionCard({ href, icon, iconColor, iconBgColor, title, description }: ActionCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 p-6 rounded-2xl shadow-sm transition-all"
      style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(13,148,136,0.3)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = '#E5E2DB';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: iconBgColor, color: iconColor }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h2
          className="font-semibold mb-0.5 transition-colors"
          style={{ color: '#1C1A17' }}
        >
          {title}
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: '#5C5850' }}>{description}</p>
      </div>
      <ChevronRight
        className="w-5 h-5 flex-shrink-0 mt-0.5 group-hover:translate-x-1 transition-transform"
        style={{ color: '#8C8880' }}
      />
    </Link>
  );
}
