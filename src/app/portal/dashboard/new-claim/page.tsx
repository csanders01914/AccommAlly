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

// ─── Step indicator ───────────────────────────────────────────────────────────

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
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all"
                style={
                  done
                    ? { backgroundColor: '#0D9488', borderColor: '#0D9488', color: '#FFFFFF' }
                    : active
                    ? { backgroundColor: '#FFFFFF', borderColor: '#0D9488', color: '#0D9488' }
                    : { backgroundColor: '#FFFFFF', borderColor: '#E5E2DB', color: '#8C8880' }
                }
              >
                {done ? <Check className="w-4 h-4" /> : num}
              </div>
              <span
                className="text-xs font-medium hidden sm:block"
                style={{ color: active ? '#1C1A17' : '#8C8880' }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="flex-1 h-px mx-2 mb-4"
                style={{ backgroundColor: num < current ? '#0D9488' : '#E5E2DB' }}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ─── Portal header ────────────────────────────────────────────────────────────

function PortalHeader({ onLogout }: { onLogout: () => void }) {
  return (
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
          onClick={onLogout}
          className="text-sm flex items-center gap-1.5 transition-colors"
          style={{ color: 'rgba(240,238,232,0.55)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#F0EEE8')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(240,238,232,0.55)')}
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </header>
  );
}

// ─── Input style helpers ──────────────────────────────────────────────────────

const textareaBaseStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E2DB',
  color: '#1C1A17',
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NewClaimPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [selectedTypes, setSelectedTypes] = useState<AccomType[]>([]);
  const [typeDescriptions, setTypeDescriptions] = useState<Partial<Record<AccomType, string>>>({});
  const [functionalNeed, setFunctionalNeed] = useState('');
  const [preferredStartDate, setPreferredStartDate] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

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
      <div className="min-h-screen" style={{ backgroundColor: '#FAF6EE' }}>
        <PortalHeader onLogout={handleLogout} />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div
            className="rounded-3xl p-10 shadow-sm"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB' }}
          >
            <div
              className="inline-flex p-3 rounded-2xl mb-4"
              style={{ backgroundColor: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)' }}
            >
              <CheckCircle className="w-8 h-8" style={{ color: '#059669' }} />
            </div>
            <h2
              className="text-2xl mb-2"
              style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#1C1A17' }}
            >
              Request Submitted
            </h2>
            <p className="text-sm mb-1" style={{ color: '#5C5850' }}>Your case number is:</p>
            <p className="text-3xl font-bold mb-6 font-mono" style={{ color: '#0D9488' }}>{submitted.caseNumber}</p>
            <p className="text-sm mb-8" style={{ color: '#5C5850' }}>
              A coordinator will review your request and may reach out to discuss next steps. You can track progress from your claims dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/portal/dashboard/claims"
                className="inline-flex items-center gap-2 font-medium px-6 py-3 rounded-xl transition-all"
                style={{ backgroundColor: '#0D9488', color: '#FFFFFF' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0F766E')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0D9488')}
              >
                View My Claims <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/portal/dashboard"
                className="inline-flex items-center justify-center gap-2 font-medium px-6 py-3 rounded-xl transition-all"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB', color: '#5C5850' }}
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
    <div className="min-h-screen" style={{ backgroundColor: '#FAF6EE' }}>
      <PortalHeader onLogout={handleLogout} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3) : router.push('/portal/dashboard')}
            className="inline-flex items-center gap-1 text-sm mb-4 transition-colors"
            style={{ color: '#8C8880' }}
          >
            <ArrowLeft className="w-4 h-4" /> {step > 1 ? 'Back' : 'Dashboard'}
          </button>
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(13,148,136,0.08)' }}
            >
              <FilePlus className="w-5 h-5" style={{ color: '#0D9488' }} />
            </div>
            <div>
              <h1
                className="text-2xl"
                style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#1C1A17' }}
              >
                Request an Accommodation
              </h1>
              <p className="text-sm" style={{ color: '#5C5850' }}>Submit a new workplace accommodation request</p>
            </div>
          </div>
          <StepIndicator current={step} />
        </div>

        {/* ── STEP 1: Select accommodation types ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div
              className="rounded-2xl p-6 shadow-sm"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB' }}
            >
              <h2 className="text-lg font-semibold mb-1" style={{ color: '#1C1A17' }}>What type of accommodation are you requesting?</h2>
              <p className="text-sm mb-5" style={{ color: '#5C5850' }}>Select all that apply. You can request more than one.</p>
              <div className="space-y-3">
                {ACCOMMODATION_TYPES.map((type) => {
                  const selected = selectedTypes.includes(type.value);
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => toggleType(type.value)}
                      className="w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4"
                      style={{
                        borderColor: selected ? '#0D9488' : '#E5E2DB',
                        backgroundColor: selected ? 'rgba(13,148,136,0.04)' : '#FFFFFF',
                      }}
                    >
                      <div
                        className="mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all"
                        style={
                          selected
                            ? { backgroundColor: '#0D9488', borderColor: '#0D9488' }
                            : { backgroundColor: 'transparent', borderColor: '#E5E2DB' }
                        }
                      >
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#1C1A17' }}>{type.label}</p>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#5C5850' }}>{type.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={selectedTypes.length === 0}
              className="w-full font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#0D9488', color: '#FFFFFF' }}
              onMouseEnter={(e) => selectedTypes.length > 0 && (e.currentTarget.style.backgroundColor = '#0F766E')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0D9488')}
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── STEP 2: Details ── */}
        {step === 2 && (
          <div className="space-y-4">
            {error && (
              <div
                className="p-3 rounded-xl text-sm flex items-center gap-2"
                style={{ backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: '#DC2626' }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            {/* Per-type descriptions */}
            <div
              className="rounded-2xl p-6 shadow-sm space-y-5"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB' }}
            >
              <div>
                <h2 className="text-lg font-semibold mb-1" style={{ color: '#1C1A17' }}>Describe what you need</h2>
                <p className="text-sm" style={{ color: '#5C5850' }}>For each accommodation type, briefly describe the specific changes or items you are requesting.</p>
              </div>
              {selectedTypes.map((type) => {
                const meta = ACCOMMODATION_TYPES.find((a) => a.value === type)!;
                return (
                  <div key={type}>
                    <label className="block text-sm font-semibold mb-1" style={{ color: '#1C1A17' }}>{meta.label}</label>
                    <textarea
                      rows={3}
                      maxLength={1000}
                      value={typeDescriptions[type] ?? ''}
                      onChange={(e) => setTypeDescriptions((prev) => ({ ...prev, [type]: e.target.value }))}
                      placeholder={`Describe the specific ${meta.label.toLowerCase()} you are requesting...`}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none"
                      style={textareaBaseStyle}
                      onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 2px #115E59')}
                      onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
                    />
                  </div>
                );
              })}
            </div>

            {/* Functional need */}
            <div
              className="rounded-2xl p-6 shadow-sm"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB' }}
            >
              <div className="flex items-start gap-3 mb-4">
                <ClipboardList className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#8C8880' }} />
                <div>
                  <h2 className="text-base font-semibold" style={{ color: '#1C1A17' }}>What is this accommodation for?</h2>
                  <p className="text-xs mt-0.5" style={{ color: '#5C5850' }}>
                    Describe the functional limitation or work challenge this accommodation would address. You are not required to disclose a specific diagnosis or medical condition.
                  </p>
                </div>
              </div>
              <textarea
                rows={4}
                maxLength={2000}
                value={functionalNeed}
                onChange={(e) => setFunctionalNeed(e.target.value)}
                placeholder="e.g. I have difficulty sitting for extended periods, which makes it hard to complete computer-based tasks."
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none"
                style={textareaBaseStyle}
                onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 2px #115E59')}
                onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
              />
              <p className="mt-2 text-xs" style={{ color: '#8C8880' }}>This information is confidential and used only to evaluate your request.</p>
            </div>

            {/* Timing */}
            <div
              className="rounded-2xl p-6 shadow-sm"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB' }}
            >
              <div className="flex items-start gap-3 mb-4">
                <Calendar className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#8C8880' }} />
                <div>
                  <h2 className="text-base font-semibold" style={{ color: '#1C1A17' }}>When would you like this accommodation to begin?</h2>
                  <p className="text-xs mt-0.5" style={{ color: '#5C5850' }}>Optional. If you have an urgent need, please note it in the additional context below.</p>
                </div>
              </div>
              <input
                type="date"
                value={preferredStartDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setPreferredStartDate(e.target.value)}
                className="rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={textareaBaseStyle}
                onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 2px #115E59')}
                onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
              />
            </div>

            {/* Additional context */}
            <div
              className="rounded-2xl p-6 shadow-sm"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB' }}
            >
              <label className="block text-sm font-semibold mb-1" style={{ color: '#1C1A17' }}>
                Additional context <span className="font-normal" style={{ color: '#8C8880' }}>(optional)</span>
              </label>
              <p className="text-xs mb-3" style={{ color: '#5C5850' }}>
                Anything else you would like your coordinator to know — urgency, prior attempts, relevant work situations, etc.
              </p>
              <textarea
                rows={4}
                maxLength={5000}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Any additional information that would help us understand your request..."
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none"
                style={textareaBaseStyle}
                onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 2px #115E59')}
                onBlur={(e) => (e.currentTarget.style.boxShadow = 'none')}
              />
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: '#0D9488', color: '#FFFFFF' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0F766E')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0D9488')}
            >
              Review Request <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── STEP 3: Review & Submit ── */}
        {step === 3 && (
          <div className="space-y-4">
            {error && (
              <div
                className="p-3 rounded-xl text-sm flex items-center gap-2"
                style={{ backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: '#DC2626' }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <div
              className="rounded-2xl p-6 shadow-sm space-y-5"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB' }}
            >
              <h2 className="text-lg font-semibold" style={{ color: '#1C1A17' }}>Review your request</h2>

              <ReviewSection label="Accommodations requested">
                <ul className="space-y-3">
                  {selectedTypes.map((type) => {
                    const meta = ACCOMMODATION_TYPES.find((a) => a.value === type)!;
                    return (
                      <li
                        key={type}
                        className="rounded-xl p-4"
                        style={{ backgroundColor: '#FAF6EE', border: '1px solid #E5E2DB' }}
                      >
                        <p className="text-sm font-semibold" style={{ color: '#1C1A17' }}>{meta.label}</p>
                        {typeDescriptions[type]?.trim() && (
                          <p className="text-xs mt-1 whitespace-pre-wrap" style={{ color: '#5C5850' }}>{typeDescriptions[type]}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </ReviewSection>

              {functionalNeed.trim() && (
                <ReviewSection label="What this accommodation is for">
                  <p className="text-sm whitespace-pre-wrap" style={{ color: '#5C5850' }}>{functionalNeed.trim()}</p>
                </ReviewSection>
              )}

              {preferredStartDate && (
                <ReviewSection label="Requested start date">
                  <p className="text-sm" style={{ color: '#5C5850' }}>
                    {new Date(preferredStartDate + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </ReviewSection>
              )}

              {additionalNotes.trim() && (
                <ReviewSection label="Additional context">
                  <p className="text-sm whitespace-pre-wrap" style={{ color: '#5C5850' }}>{additionalNotes.trim()}</p>
                </ReviewSection>
              )}
            </div>

            <p className="text-xs px-1" style={{ color: '#8C8880' }}>
              By submitting, you confirm the information above is accurate. A coordinator will contact you to begin the interactive accommodation process.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                style={{ backgroundColor: '#0D9488', color: '#FFFFFF' }}
                onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#0F766E')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0D9488')}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Submit Request <ArrowRight className="w-4 h-4" /></>}
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 font-medium py-3 rounded-xl transition-all"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E2DB', color: '#5C5850' }}
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
      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8C8880' }}>{label}</p>
      {children}
    </div>
  );
}
