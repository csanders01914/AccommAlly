'use client';

import { apiFetch } from '@/lib/api-client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  LogOut,
  ArrowLeft,
  FilePlus,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';

export default function NewClaimPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    description: '',
    medicalCondition: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<{ caseNumber: string } | null>(null);

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await apiFetch('/api/public/portal/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.status === 401) {
        router.push('/portal/login');
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setSubmitted({ caseNumber: data.claim.caseNumber });
      } else {
        setError(data.error || 'Submission failed. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await apiFetch('/api/public/portal/logout', { method: 'POST' });
    router.push('/portal');
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <PortalHeader onLogout={handleLogout} />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-surface border border-border rounded-3xl p-10 shadow-sm">
            <div className="inline-flex p-3 rounded-2xl bg-green-500/10 mb-4 ring-1 ring-green-500/20">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">Claim Submitted</h2>
            <p className="text-text-secondary mb-1">Your case number is:</p>
            <p className="text-3xl font-bold text-primary-500 mb-6">{submitted.caseNumber}</p>
            <p className="text-sm text-text-secondary mb-8">
              A coordinator will review your request and reach out. You can track the status of your claim from your dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/portal/dashboard/claims"
                className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-medium px-6 py-3 rounded-xl transition-all"
              >
                View My Claims <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/portal/dashboard"
                className="inline-flex items-center justify-center gap-2 bg-surface border border-border hover:bg-surface-raised text-text-secondary font-medium px-6 py-3 rounded-xl transition-all"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader onLogout={handleLogout} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/portal/dashboard"
            className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
              <FilePlus className="w-5 h-5 text-teal-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">File a New Claim</h1>
              <p className="text-sm text-text-secondary">Submit a new accommodation request</p>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-text-primary mb-2">
                Request Title <span className="text-red-400">*</span>
              </label>
              <input
                id="title"
                type="text"
                maxLength={200}
                value={form.title}
                onChange={set('title')}
                placeholder="e.g. Request for ergonomic workstation due to back injury"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary outline-none focus:ring-2 focus:ring-[#0D9488] transition-all placeholder-text-muted"
                required
              />
              <p className="mt-1 text-xs text-text-muted">{form.title.length}/200 characters</p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-text-primary mb-2">
                Description
              </label>
              <textarea
                id="description"
                rows={5}
                maxLength={5000}
                value={form.description}
                onChange={set('description')}
                placeholder="Describe your accommodation needs in detail. Include how your condition affects your work and what accommodations you believe would help."
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary outline-none focus:ring-2 focus:ring-[#0D9488] transition-all placeholder-text-muted resize-none"
              />
              <p className="mt-1 text-xs text-text-muted">{form.description.length}/5000 characters</p>
            </div>

            <div>
              <label htmlFor="medicalCondition" className="block text-sm font-medium text-text-primary mb-2">
                Medical Condition <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <input
                id="medicalCondition"
                type="text"
                value={form.medicalCondition}
                onChange={set('medicalCondition')}
                placeholder="e.g. Chronic back pain, ADHD, visual impairment"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary outline-none focus:ring-2 focus:ring-[#0D9488] transition-all placeholder-text-muted"
              />
              <p className="mt-1 text-xs text-text-muted">
                This information is kept confidential and used only to evaluate your request.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>Submit Claim <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
              <Link
                href="/portal/dashboard"
                className="flex-1 text-center bg-surface border border-border hover:bg-surface-raised text-text-secondary font-medium py-3 rounded-xl transition-all"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

function PortalHeader({ onLogout }: { onLogout: () => void }) {
  return (
    <header className="border-b border-border bg-surface sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary-500" />
          <span className="text-text-primary font-bold">AccommAlly Portal</span>
        </div>
        <button
          onClick={onLogout}
          className="text-sm text-text-secondary hover:text-text-primary flex items-center gap-2 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </header>
  );
}
