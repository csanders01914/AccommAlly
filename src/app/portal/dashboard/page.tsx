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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  const firstName = claimant?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary-500" />
            <span className="text-text-primary font-bold">AccommAlly Portal</span>
          </div>
          {claimant && (
            <span className="text-sm text-text-secondary hidden sm:block">
              Claimant #{claimant.claimantNumber}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-text-secondary hover:text-text-primary flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-text-primary">
            Welcome back, {firstName}
          </h1>
          <p className="text-text-secondary mt-1">What would you like to do today?</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <ActionCard
            href="/portal/dashboard/new-claim"
            icon={<FilePlus className="w-6 h-6" />}
            iconBg="bg-teal-500/10 text-teal-500"
            title="File a New Claim"
            description="Submit a new accommodation request to your organization"
          />
          <ActionCard
            href="/portal/dashboard/claims"
            icon={<FolderSearch className="w-6 h-6" />}
            iconBg="bg-blue-500/10 text-blue-500"
            title="View My Claims"
            description="Review the status and details of your existing claims"
          />
          <ActionCard
            href="/portal/dashboard/claims?tab=messages"
            icon={<MessageSquare className="w-6 h-6" />}
            iconBg="bg-violet-500/10 text-violet-500"
            title="Message My Examiner"
            description="Send or review messages with your assigned examiner"
          />
          <ActionCard
            href="/portal/dashboard/claims?tab=documents"
            icon={<Upload className="w-6 h-6" />}
            iconBg="bg-orange-500/10 text-orange-500"
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
  iconBg: string;
  title: string;
  description: string;
}

function ActionCard({ href, icon, iconBg, title, description }: ActionCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 p-6 bg-surface border border-border rounded-2xl shadow-sm hover:shadow-md hover:border-primary-500/30 transition-all"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-text-primary group-hover:text-primary-500 transition-colors">
          {title}
        </h2>
        <p className="text-sm text-text-secondary mt-0.5 leading-relaxed">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-primary-500 group-hover:translate-x-1 transition-all flex-shrink-0 mt-0.5" />
    </Link>
  );
}
