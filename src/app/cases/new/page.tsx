'use client';
import { apiFetch } from '@/lib/api-client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, User, Mail, Phone, FileText,
    Calendar, Briefcase, Shield, Loader2, Eye, EyeOff,
} from 'lucide-react';

interface FormData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    birthdate: string;
    ssn: string;
    program: string;
    venue: string;
    accommodationType: string;
    description: string;
    reason: string;
    preferredStartDate: string;
    preferredContact: 'email' | 'phone' | 'either';
    credentialType: 'PIN' | 'PASSPHRASE';
    credential: string;
}

const INITIAL: FormData = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthdate: '',
    ssn: '',
    program: '',
    venue: '',
    accommodationType: 'equipment',
    description: '',
    reason: '',
    preferredStartDate: '',
    preferredContact: 'either',
    credentialType: 'PIN',
    credential: '',
};

// ── Shared styles ──────────────────────────────────────────────────────────

const inputCls =
    'w-full px-3 py-2 text-sm border border-[#E5E2DB] rounded-lg bg-[#ffffff] text-[#1C1A17] placeholder-[#8C8880] focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] transition-colors';

const labelCls = 'block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8C8880] mb-1.5';

function Section({ title, icon: Icon, children }: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
}) {
    return (
        <section className="bg-[#ffffff] border border-[#E5E2DB] rounded-xl shadow-[0_1px_2px_rgba(28,26,23,0.04)] p-6">
            <h2 className="text-base font-semibold text-[#1C1A17] mb-5 flex items-center gap-2">
                <Icon className="w-4 h-4 text-[#0D9488]" />
                {title}
            </h2>
            {children}
        </section>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function NewCasePage() {
    const router = useRouter();
    const [form, setForm] = useState<FormData>(INITIAL);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [showCredential, setShowCredential] = useState(false);

    const set = (field: keyof FormData) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
            setForm(prev => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors([]);

        try {
            const body = {
                ...form,
                fullName: `${form.firstName} ${form.lastName}`.trim(),
            };

            const res = await apiFetch('/api/cases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json();
                if (data.details?.length) {
                    setErrors(data.details.map((d: { message: string }) => d.message));
                } else {
                    setErrors([data.error || 'Failed to create case']);
                }
                return;
            }

            const result = await res.json();
            router.push(`/cases/${result.caseId}`);
        } catch {
            setErrors(['An unexpected error occurred. Please try again.']);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#1C1A17]">
            {/* ── Editorial band ── */}
            <div
                className="relative overflow-hidden"
                style={{ padding: '36px 48px 28px' }}
            >
                <div
                    aria-hidden
                    style={{
                        position: 'absolute', inset: 0, pointerEvents: 'none',
                        backgroundImage: 'radial-gradient(ellipse at 10% 60%,rgba(13,148,136,0.15) 0%,transparent 55%)',
                    }}
                />
                <div
                    aria-hidden
                    style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
                        background: 'linear-gradient(to right,transparent,rgba(13,148,136,0.5),transparent)',
                    }}
                />
                <div className="relative z-10 max-w-3xl mx-auto">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#0D9488] hover:text-[#2DD4BF] transition-colors mb-4"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Cases
                    </button>
                    <h1
                        style={{ fontFamily: 'var(--font-instrument-serif, Georgia, serif)', fontSize: 44, fontWeight: 400, lineHeight: 1.1, color: '#F0EEE8', margin: 0 }}
                    >
                        New Accommodation Request
                    </h1>
                    <p className="mt-3 text-sm" style={{ color: 'rgba(240,238,232,0.55)' }}>
                        Create a new case for an employee or applicant accommodation request.
                    </p>
                </div>
            </div>

            {/* ── Form surface ── */}
            <div className="bg-[#F8F7F5] min-h-[calc(100vh-200px)]">
                <div className="max-w-3xl mx-auto px-6 py-8">
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Client Information */}
                        <Section title="Client Information" icon={User}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className={labelCls}>First Name *</label>
                                    <input type="text" required value={form.firstName} onChange={set('firstName')} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Last Name *</label>
                                    <input type="text" required value={form.lastName} onChange={set('lastName')} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Email Address *</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C8880]" />
                                        <input type="email" required value={form.email} onChange={set('email')} className={`${inputCls} pl-9`} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Phone Number *</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C8880]" />
                                        <input type="tel" required value={form.phone} onChange={set('phone')} className={`${inputCls} pl-9`} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Date of Birth *</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C8880]" />
                                        <input type="date" required value={form.birthdate} onChange={set('birthdate')} className={`${inputCls} pl-9`} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>SSN <span className="normal-case font-normal text-[#8C8880]">(optional)</span></label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C8880]" />
                                        <input type="text" placeholder="XXX-XX-XXXX" value={form.ssn} onChange={set('ssn')} className={`${inputCls} pl-9`} />
                                    </div>
                                    <p className="text-[11px] text-[#8C8880] mt-1">Encrypted at rest. Only last 4 digits visible by default.</p>
                                </div>
                                <div className="md:col-span-2">
                                    <label className={labelCls}>Preferred Contact</label>
                                    <select value={form.preferredContact} onChange={set('preferredContact')} className={inputCls}>
                                        <option value="either">Either</option>
                                        <option value="email">Email</option>
                                        <option value="phone">Phone</option>
                                    </select>
                                </div>
                            </div>
                        </Section>

                        {/* Request Details */}
                        <Section title="Request Details" icon={Briefcase}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className={labelCls}>Program / Department</label>
                                    <input type="text" value={form.program} onChange={set('program')} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Work Venue / Location</label>
                                    <input type="text" value={form.venue} onChange={set('venue')} className={inputCls} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className={labelCls}>Accommodation Type *</label>
                                    <select required value={form.accommodationType} onChange={set('accommodationType')} className={inputCls}>
                                        <option value="equipment">Equipment Modification</option>
                                        <option value="schedule">Schedule Modification</option>
                                        <option value="remote">Remote Work Arrangement</option>
                                        <option value="assistive">Assistive Technology</option>
                                        <option value="medical">Medical Leave</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Preferred Start Date</label>
                                    <input type="date" value={form.preferredStartDate} onChange={set('preferredStartDate')} className={inputCls} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className={labelCls}>Description of Request *</label>
                                    <textarea
                                        required rows={4} value={form.description} onChange={set('description')}
                                        placeholder="Describe the accommodation needed…"
                                        className={inputCls}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className={labelCls}>Reason / Medical Condition</label>
                                    <textarea
                                        rows={3} value={form.reason} onChange={set('reason')}
                                        placeholder="Explain the reason for the request…"
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                        </Section>

                        {/* Portal Access */}
                        <Section title="Claimant Portal Access" icon={Shield}>
                            <p className="text-sm text-[#5C5850] mb-4">
                                Set a PIN or passphrase so the claimant can securely access their case status through the portal.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className={labelCls}>Credential Type</label>
                                    <select value={form.credentialType} onChange={set('credentialType')} className={inputCls}>
                                        <option value="PIN">PIN (4–6 digits)</option>
                                        <option value="PASSPHRASE">Passphrase (12–65 characters)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>
                                        {form.credentialType === 'PIN' ? 'PIN *' : 'Passphrase *'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showCredential ? 'text' : 'password'}
                                            required
                                            value={form.credential}
                                            onChange={set('credential')}
                                            placeholder={form.credentialType === 'PIN' ? '4–6 digit PIN' : 'Min. 12 characters'}
                                            className={`${inputCls} pr-10`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCredential(v => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8880] hover:text-[#1C1A17] transition-colors"
                                        >
                                            {showCredential ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-[#8C8880] mt-1">
                                        {form.credentialType === 'PIN'
                                            ? 'Share this PIN with the claimant. It cannot be recovered — only reset.'
                                            : 'Share this passphrase with the claimant. It cannot be recovered — only reset.'}
                                    </p>
                                </div>
                            </div>
                        </Section>

                        {/* Errors */}
                        {errors.length > 0 && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                                <p className="font-semibold mb-1">Please fix the following:</p>
                                <ul className="list-disc list-inside space-y-0.5">
                                    {errors.map((e, i) => <li key={i}>{e}</li>)}
                                </ul>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-2 pb-8">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-4 py-2 text-sm font-medium text-[#5C5850] hover:bg-[#F3F1EC] rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-[#ffffff] text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                Create Case
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
