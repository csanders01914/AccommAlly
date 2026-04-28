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
  const styles: Record<string, { color: string; bg: string; border: string }> = {
    OPEN:           { color: '#D97706', bg: 'rgba(217,119,6,0.08)',   border: 'rgba(217,119,6,0.25)' },
    IN_PROGRESS:    { color: '#2563EB', bg: 'rgba(37,99,235,0.08)',   border: 'rgba(37,99,235,0.25)' },
    PENDING_REVIEW: { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.25)' },
    CLOSED:         { color: '#059669', bg: 'rgba(5,150,105,0.08)',   border: 'rgba(5,150,105,0.25)' },
    ARCHIVED:       { color: '#8C8880', bg: 'rgba(140,136,128,0.08)', border: 'rgba(140,136,128,0.25)' },
    APPEAL:         { color: '#EA580C', bg: 'rgba(234,88,12,0.08)',   border: 'rgba(234,88,12,0.25)' },
  };
  const s = styles[status] ?? styles.OPEN;
  const icon = status === 'CLOSED'
    ? <CheckCircle className="w-3 h-3" />
    : <Clock className="w-3 h-3" />;
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: s.color, backgroundColor: s.bg, border: `1px solid ${s.border}` }}
    >
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
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/portal/dashboard"
            className="inline-flex items-center gap-1 text-sm mb-4 transition-colors"
            style={{ color: '#8C8880' }}
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(37,99,235,0.08)' }}
              >
                <FolderSearch className="w-5 h-5" style={{ color: '#2563EB' }} />
              </div>
              <div>
                <h1
                  className="text-2xl"
                  style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#1C1A17' }}
                >
                  My Claims
                </h1>
                <p className="text-sm" style={{ color: '#5C5850' }}>
                  {tabHint ?? 'All your accommodation requests'}
                </p>
              </div>
            </div>
            <Link
              href="/portal/dashboard/new-claim"
              className="hidden sm:inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-sm"
              style={{ backgroundColor: '#0D9488', color: '#FFFFFF' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0F766E')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0D9488')}
            >
              <FilePlus className="w-4 h-4" /> New Claim
            </Link>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0D9488' }} />
          </div>
        )}

        {error && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB' }}
          >
            <AlertCircle className="w-8 h-8 mx-auto mb-3" style={{ color: '#DC2626' }} />
            <p className="text-sm mb-4" style={{ color: '#5C5850' }}>{error}</p>
            <button
              onClick={fetchClaims}
              className="text-sm font-medium transition-colors"
              style={{ color: '#0D9488' }}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && claims.length === 0 && (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB' }}
          >
            <FolderSearch className="w-10 h-10 mx-auto mb-4" style={{ color: '#8C8880' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#1C1A17' }}>No claims yet</h3>
            <p className="text-sm mb-6" style={{ color: '#5C5850' }}>
              You haven&apos;t filed any accommodation requests.
            </p>
            <Link
              href="/portal/dashboard/new-claim"
              className="inline-flex items-center gap-2 font-medium px-6 py-3 rounded-xl transition-all"
              style={{ backgroundColor: '#0D9488', color: '#FFFFFF' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0F766E')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0D9488')}
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
                className="group flex items-center gap-4 p-5 rounded-2xl shadow-sm transition-all"
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="text-xs font-mono" style={{ color: '#8C8880' }}>{claim.caseNumber}</span>
                    <StatusBadge status={claim.status} />
                  </div>
                  <p className="font-semibold truncate" style={{ color: '#1C1A17' }}>{claim.title}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs" style={{ color: '#8C8880' }}>Filed {new Date(claim.createdAt).toLocaleDateString()}</span>
                    {claim.examiner && <span className="text-xs" style={{ color: '#8C8880' }}>Examiner: {claim.examiner}</span>}
                  </div>
                </div>
                <ChevronRight
                  className="w-5 h-5 flex-shrink-0 group-hover:translate-x-1 transition-transform"
                  style={{ color: '#8C8880' }}
                />
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
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF6EE' }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0D9488' }} />
        </div>
      }
    >
      <ClaimsPageInner />
    </Suspense>
  );
}
