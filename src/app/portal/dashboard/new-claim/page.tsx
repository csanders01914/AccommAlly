'use client';

import { apiFetch } from '@/lib/api-client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  LogOut,
  ArrowLeft,
  ArrowRight,
  FilePlus,
  CheckCircle,
  AlertCircle,
  Loader2,
  Check,
  Calendar,
  ClipboardList,
  ChevronRight,
} from 'lucide-react';

// ─── Accommodation type config ───────────────────────────────────────────────

const ACCOMMODATION_TYPES = [
  {
    value: 'PHYSICAL_ACCOMMODATION',
    label: 'Physical Workspace Accommodation',
    description: 'Changes to your workstation or physical environment, such as a sit-stand desk, specialized chair, or repositioned equipment.',
  },
  {
    value: 'ENVIRONMENTAL_MODIFICATION',
    label: 'Environmental Modification',
    description: 'Modifications to lighting, noise levels, temperature, or other environmental factors in your workspace.',
  },
  {
    value: 'SCHEDULE_MODIFICATION',
    label: 'Schedule or Hours Modification',
    description: 'Adjusted start/end times, a compressed schedule, remote work arrangements, or other changes to when or where you work.',
  },
  {
    value: 'LEAVE_OF_ABSENCE',
    label: 'Leave of Absence',
    description: 'Continuous or intermittent time off related to your accommodation need, including reduced hours.',
  },
  {
    value: 'JOB_AID',
    label: 'Assistive Equipment or Technology',
    description: 'Tools, devices, or software that help you perform your job — for example, ergonomic peripherals, screen-reading software, or magnification aids.',
  },
  {
    value: 'CHANGE_IN_FUNCTIONS',
    label: 'Change in Job Duties or Functions',
    description: 'Temporary or permanent reassignment of specific tasks, or restructuring of your role to better match your current capabilities.',
  },
] as const;

type AccomType = (typeof ACCOMMODATION_TYPES)[number]['value'];

function buildTitle(types: AccomType[]): string {
  if (types.length === 0) return '';
  const labels = types.map((t) => ACCOMMODATION_TYPES.find((a) => a.value === t)!.label);
  if (labels.length === 1) return `${labels[0]} Request`;
  const last = labels.pop();
  return `${labels.join(', ')} and ${last} Request`;
}

// ─── Step components ─────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = ['Accommodation Type', 'Request Details', 'Review & Submit'];
  return (
    <ol className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;
        return (
          <li key={num} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all ${
                done ? 'bg-slate-800 border-slate-800 text-white' :
                active ? 'bg-white border-slate-800 text-slate-800' :
                'bg-surface border-border text-text-muted'
              }`}>
                {done ? <Check className="w-4 h-4" /> : num}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${active ? 'text-text-primary' : 'text-text-muted'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-2 mb-4 ${num < current ? 'bg-slate-800' : 'bg-border'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function NewClaimPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [selectedTypes, setSelectedTypes] = useState<AccomType[]>([]);

  // Step 2
  const [typeDescriptions, setTypeDescriptions] = useState<Partial<Record<AccomType, string>>>({});
  const [functionalNeed, setFunctionalNeed] = useState('');
  const [preferredStartDate, setPreferredStartDate] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Submission
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<{ caseNumber: string } | null>(null);

  const toggleType = (type: AccomType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/public/portal/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: buildTitle(selectedTypes),
          functionalNeed: functionalNeed.trim() || null,
          description: additionalNotes.trim() || null,
          preferredStartDate: preferredStartDate || null,
          accommodationTypes: selectedTypes.map((type) => ({
            type,
            description: typeDescriptions[type]?.trim() || ACCOMMODATION_TYPES.find((a) => a.value === type)!.label,
          })),
        }),
      });
      if (res.status === 401) { router.push('/portal/login'); return; }
      const data = await res.json();
      if (res.ok) {
        setSubmitted({ caseNumber: data.claim.caseNumber });
      } else {
        setError(data.error || 'Submission failed. Please try again.');
        setStep(2);
      }
    } catch {
      setError('An error occurred. Please try again.');
      setStep(2);
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
            <h2 className="text-2xl font-bold text-text-primary mb-2">Request Submitted</h2>
            <p className="text-text-secondary mb-1">Your case number is:</p>
            <p className="text-3xl font-bold text-slate-700 dark:text-slate-300 mb-6 font-mono">{submitted.caseNumber}</p>
            <p className="text-sm text-text-secondary mb-8">
              A coordinator will review your request and may reach out to discuss next steps. You can track progress from your claims dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/portal/dashboard/claims"
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-medium px-6 py-3 rounded-xl transition-all"
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
          <button
            onClick={() => step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3) : router.push('/portal/dashboard')}
            className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> {step > 1 ? 'Back' : 'Dashboard'}
          </button>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-slate-800/10 flex items-center justify-center">
              <FilePlus className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Request an Accommodation</h1>
              <p className="text-sm text-text-secondary">Submit a new workplace accommodation request</p>
            </div>
          </div>
          <StepIndicator current={step} />
        </div>

        {/* ── STEP 1: Select accommodation types ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-text-primary mb-1">What type of accommodation are you requesting?</h2>
              <p className="text-sm text-text-secondary mb-5">Select all that apply. You can request more than one.</p>
              <div className="space-y-3">
                {ACCOMMODATION_TYPES.map((type) => {
                  const selected = selectedTypes.includes(type.value);
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => toggleType(type.value)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 ${
                        selected
                          ? 'border-slate-800 bg-slate-800/5 dark:bg-slate-200/5'
                          : 'border-border hover:border-slate-400 bg-surface'
                      }`}
                    >
                      <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                        selected ? 'bg-slate-800 border-slate-800' : 'border-border'
                      }`}>
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{type.label}</p>
                        <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{type.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={selectedTypes.length === 0}
              className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── STEP 2: Details ── */}
        {step === 2 && (
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            {/* Per-type descriptions */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-1">Describe what you need</h2>
                <p className="text-sm text-text-secondary">For each accommodation type, briefly describe the specific changes or items you are requesting.</p>
              </div>
              {selectedTypes.map((type) => {
                const meta = ACCOMMODATION_TYPES.find((a) => a.value === type)!;
                return (
                  <div key={type}>
                    <label className="block text-sm font-semibold text-text-primary mb-1">{meta.label}</label>
                    <textarea
                      rows={3}
                      maxLength={1000}
                      value={typeDescriptions[type] ?? ''}
                      onChange={(e) => setTypeDescriptions((prev) => ({ ...prev, [type]: e.target.value }))}
                      placeholder={`Describe the specific ${meta.label.toLowerCase()} you are requesting...`}
                      className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary outline-none focus:ring-2 focus:ring-slate-400 transition-all placeholder-text-muted resize-none text-sm"
                    />
                  </div>
                );
              })}
            </div>

            {/* Functional need — CA law compliant */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <ClipboardList className="w-5 h-5 text-text-muted mt-0.5 flex-shrink-0" />
                <div>
                  <h2 className="text-base font-semibold text-text-primary">What is this accommodation for?</h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Describe the functional limitation or work challenge this accommodation would address. You are not required to disclose a specific diagnosis or medical condition.
                  </p>
                </div>
              </div>
              <textarea
                rows={4}
                maxLength={2000}
                value={functionalNeed}
                onChange={(e) => setFunctionalNeed(e.target.value)}
                placeholder="e.g. I have difficulty sitting for extended periods, which makes it hard to complete computer-based tasks. / I experience fatigue that affects my concentration in the afternoon."
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary outline-none focus:ring-2 focus:ring-slate-400 transition-all placeholder-text-muted resize-none text-sm"
              />
              <p className="mt-2 text-xs text-text-muted">This information is confidential and used only to evaluate your request.</p>
            </div>

            {/* Timing */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <Calendar className="w-5 h-5 text-text-muted mt-0.5 flex-shrink-0" />
                <div>
                  <h2 className="text-base font-semibold text-text-primary">When would you like this accommodation to begin?</h2>
                  <p className="text-xs text-text-secondary mt-0.5">Optional. If you have an urgent need, please note it in the additional context below.</p>
                </div>
              </div>
              <input
                type="date"
                value={preferredStartDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setPreferredStartDate(e.target.value)}
                className="bg-surface border border-border rounded-xl px-4 py-3 text-text-primary outline-none focus:ring-2 focus:ring-slate-400 transition-all text-sm"
              />
            </div>

            {/* Additional context */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
              <label className="block text-sm font-semibold text-text-primary mb-1">
                Additional context <span className="font-normal text-text-muted">(optional)</span>
              </label>
              <p className="text-xs text-text-secondary mb-3">
                Anything else you would like your coordinator to know — urgency, prior attempts, relevant work situations, etc.
              </p>
              <textarea
                rows={4}
                maxLength={5000}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Any additional information that would help us understand your request..."
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary outline-none focus:ring-2 focus:ring-slate-400 transition-all placeholder-text-muted resize-none text-sm"
              />
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Review Request <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── STEP 3: Review & Submit ── */}
        {step === 3 && (
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-5">
              <h2 className="text-lg font-semibold text-text-primary">Review your request</h2>

              <ReviewSection label="Accommodations requested">
                <ul className="space-y-3">
                  {selectedTypes.map((type) => {
                    const meta = ACCOMMODATION_TYPES.find((a) => a.value === type)!;
                    return (
                      <li key={type} className="bg-background border border-border rounded-xl p-4">
                        <p className="text-sm font-semibold text-text-primary">{meta.label}</p>
                        {typeDescriptions[type]?.trim() && (
                          <p className="text-xs text-text-secondary mt-1 whitespace-pre-wrap">{typeDescriptions[type]}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </ReviewSection>

              {functionalNeed.trim() && (
                <ReviewSection label="What this accommodation is for">
                  <p className="text-sm text-text-secondary whitespace-pre-wrap">{functionalNeed.trim()}</p>
                </ReviewSection>
              )}

              {preferredStartDate && (
                <ReviewSection label="Requested start date">
                  <p className="text-sm text-text-secondary">
                    {new Date(preferredStartDate + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </ReviewSection>
              )}

              {additionalNotes.trim() && (
                <ReviewSection label="Additional context">
                  <p className="text-sm text-text-secondary whitespace-pre-wrap">{additionalNotes.trim()}</p>
                </ReviewSection>
              )}
            </div>

            <p className="text-xs text-text-muted px-1">
              By submitting, you confirm the information above is accurate. A coordinator will contact you to begin the interactive accommodation process.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Submit Request <ArrowRight className="w-4 h-4" /></>}
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-surface border border-border hover:bg-surface-raised text-text-secondary font-medium py-3 rounded-xl transition-all"
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ReviewSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{label}</p>
      {children}
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
