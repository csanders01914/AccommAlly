'use client';

import { apiFetch } from '@/lib/api-client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  LogOut,
  ArrowLeft,
  FolderSearch,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  FilePlus,
} from 'lucide-react';
import { Suspense } from 'react';

interface Claim {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  examiner: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OPEN: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    IN_PROGRESS: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    PENDING_REVIEW: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
    CLOSED: 'text-green-500 bg-green-500/10 border-green-500/20',
    ARCHIVED: 'text-text-muted bg-surface border-border',
    APPEAL: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  };
  const icon = status === 'CLOSED' ? (
    <CheckCircle className="w-3 h-3" />
  ) : (
    <Clock className="w-3 h-3" />
  );
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${styles[status] ?? styles.OPEN}`}>
      {icon}
      {status.replace('_', ' ')}
    </span>
  );
}

function ClaimsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchClaims = useCallback(() => {
    setLoading(true);
    apiFetch('/api/public/portal/claims')
      .then(async (res) => {
        if (res.status === 401) {
          router.push('/portal/login');
          throw new Error('Unauthorized');
        }
        if (!res.ok) throw new Error('Failed to load claims');
        return res.json();
      })
      .then((data) => setClaims(data.claims || []))
      .catch((err) => {
        if (err.message !== 'Unauthorized') {
          setError(err.message || 'Could not load your claims.');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const handleLogout = async () => {
    await apiFetch('/api/public/portal/logout', { method: 'POST' });
    router.push('/portal');
  };

  const tabHint = tab === 'messages'
    ? 'Select a claim to message your examiner.'
    : tab === 'documents'
    ? 'Select a claim to upload or view documents.'
    : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary-500" />
            <span className="text-text-primary font-bold">AccommAlly Portal</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-text-secondary hover:text-text-primary flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/portal/dashboard"
            className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <FolderSearch className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">My Claims</h1>
                <p className="text-sm text-text-secondary">
                  {tabHint ?? 'All your accommodation requests'}
                </p>
              </div>
            </div>
            <Link
              href="/portal/dashboard/new-claim"
              className="hidden sm:inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-sm"
            >
              <FilePlus className="w-4 h-4" /> New Claim
            </Link>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-text-secondary text-sm mb-4">{error}</p>
            <button
              onClick={fetchClaims}
              className="text-sm text-primary-500 hover:text-primary-600 font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && claims.length === 0 && (
          <div className="bg-surface border border-border rounded-2xl p-12 text-center">
            <FolderSearch className="w-10 h-10 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">No claims yet</h3>
            <p className="text-text-secondary text-sm mb-6">
              You haven&apos;t filed any accommodation requests.
            </p>
            <Link
              href="/portal/dashboard/new-claim"
              className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-medium px-6 py-3 rounded-xl transition-all"
            >
              <FilePlus className="w-4 h-4" /> File a Claim
            </Link>
          </div>
        )}

        {!loading && !error && claims.length > 0 && (
          <div className="space-y-3">
            {claims.map((claim) => (
              <Link
                key={claim.id}
                href={`/portal/dashboard/claims/${claim.id}${tab ? `?tab=${tab}` : ''}`}
                className="group flex items-center gap-4 p-5 bg-surface border border-border rounded-2xl shadow-sm hover:shadow-md hover:border-primary-500/30 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="text-xs font-mono text-text-muted">{claim.caseNumber}</span>
                    <StatusBadge status={claim.status} />
                  </div>
                  <p className="font-semibold text-text-primary truncate">{claim.title}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-text-muted">
                    <span>Filed {new Date(claim.createdAt).toLocaleDateString()}</span>
                    {claim.examiner && <span>Examiner: {claim.examiner}</span>}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-primary-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ClaimsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      }
    >
      <ClaimsPageInner />
    </Suspense>
  );
}
