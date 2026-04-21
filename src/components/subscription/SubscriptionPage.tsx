'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Shield, Users, FolderOpen, CheckCircle, ExternalLink, AlertTriangle, Loader2, CreditCard } from 'lucide-react';
import { apiFetchJSON } from '@/lib/api-client';
import { SubscribeModal } from './SubscribeModal';
import { UpgradeConfirmModal } from './UpgradeConfirmModal';
import { DowngradeModal } from './DowngradeModal';

// ── Static plan definitions ────────────────────────────────────────────────

interface PlanDef {
    code: string;
    name: string;
    monthlyPrice: number;
    yearlyPrice: number;
    maxUsers: number;
    maxClaims: number;
    features: string[];
    highlight?: boolean;
}

const PLANS: PlanDef[] = [
    {
        code: 'STARTER',
        name: 'Starter',
        monthlyPrice: 7,
        yearlyPrice: 75.60,
        maxUsers: 3,
        maxClaims: 25,
        features: [
            'Up to 3 staff users',
            'Up to 25 open cases',
            'Full case management',
            'Document storage & control',
            'Unlimited report exports',
        ],
    },
    {
        code: 'PRO',
        name: 'Professional',
        monthlyPrice: 75,
        yearlyPrice: 810,
        maxUsers: 10,
        maxClaims: 100,
        features: [
            'Up to 10 staff users',
            'Up to 100 open cases',
            'Everything in Starter',
            'Advanced analytics',
            'Priority support',
        ],
        highlight: true,
    },
    {
        code: 'ENTERPRISE',
        name: 'Enterprise',
        monthlyPrice: 200,
        yearlyPrice: 2160,
        maxUsers: 25,
        maxClaims: 500,
        features: [
            'Up to 25 staff users',
            'Up to 500 open cases',
            'Everything in Professional',
            'Dedicated account support',
            'Custom integration assistance',
        ],
    },
];

const PLAN_ORDER = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'];

// ── Types ──────────────────────────────────────────────────────────────────

interface SubscriptionData {
    plan: { id: string; code: string; name: string; maxUsers: number; maxActiveClaims: number } | null;
    subscriptionStatus: string | null;
    currentPeriodEnd: string | null;
    billingInterval: string | null;
    usage: { activeUsers: number; openClaims: number };
}

type ModalState =
    | null
    | { type: 'subscribe'; plan: PlanDef }
    | { type: 'upgrade'; plan: PlanDef }
    | { type: 'downgrade'; plan: PlanDef };

// ── Main component ─────────────────────────────────────────────────────────

interface SubscriptionPageProps {
    currentUserId: string;
}

export function SubscriptionPage({ currentUserId }: SubscriptionPageProps) {
    const [data, setData] = useState<SubscriptionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [interval, setInterval_] = useState<'monthly' | 'yearly'>('monthly');
    const [modal, setModal] = useState<ModalState>(null);

    const load = useCallback(async () => {
        try {
            const d = await apiFetchJSON<SubscriptionData>('/api/subscription');
            setData(d);
        } catch { /* silently ignore — user sees loading state */ } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSuccess = () => {
        setModal(null);
        setLoading(true);
        load();
    };

    const handlePortal = async () => {
        try {
            const { url } = await apiFetchJSON<{ url: string }>('/api/subscription/portal', { method: 'POST', body: JSON.stringify({}) });
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch { /* ignore */ }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0D9488' }} />
            </div>
        );
    }

    const currentCode = data?.plan?.code ?? 'FREE';
    const currentName = data?.plan?.name ?? 'Free';
    const isActive = data?.subscriptionStatus === 'active';
    const isPastDue = data?.subscriptionStatus === 'past_due';
    const hasSubscription = !!data?.subscriptionStatus;
    const currentIdx = PLAN_ORDER.indexOf(currentCode);

    return (
        <div className="p-8 max-w-5xl">
            {/* Page header */}
            <div className="mb-8 pl-1">
                <h1 className="text-2xl font-bold flex items-center gap-3" style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#1C1A17' }}>
                    <CreditCard className="w-7 h-7" style={{ color: '#0D9488' }} />
                    Subscription
                </h1>
                <p className="mt-1" style={{ color: '#8C8880' }}>Manage your plan, billing, and team access limits.</p>
            </div>

            {/* Past-due warning */}
            {isPastDue && (
                <div className="mb-6 flex items-center gap-3 rounded-xl px-4 py-3.5" style={{ backgroundColor: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)' }}>
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#F87171' }} />
                    <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: '#1C1A17' }}>Payment failed</p>
                        <p className="text-xs mt-0.5" style={{ color: '#8C8880' }}>Update your payment method to keep your subscription active.</p>
                    </div>
                    <button
                        onClick={handlePortal}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: '#F87171', color: '#ffffff' }}
                    >
                        Update Card <ExternalLink className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* Current plan + usage banner */}
            <div className="mb-6 rounded-xl px-5 py-4" style={{ backgroundColor: '#ffffff', border: '1px solid #E5E2DB' }}>
                <div className="flex flex-wrap items-center gap-4 justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(13,148,136,0.1)' }}>
                            <Shield className="w-4 h-4" style={{ color: '#0D9488' }} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold" style={{ color: '#1C1A17' }}>{currentName}</span>
                                {isActive && (
                                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(13,148,136,0.12)', color: '#0D9488' }}>Active</span>
                                )}
                                {isPastDue && (
                                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(248,113,113,0.12)', color: '#F87171' }}>Past Due</span>
                                )}
                            </div>
                            {data?.currentPeriodEnd && (
                                <p className="text-xs mt-0.5" style={{ color: '#8C8880' }}>
                                    Renews {format(new Date(data.currentPeriodEnd), 'MMM d, yyyy')} · {data.billingInterval === 'yearly' ? 'Annually' : 'Monthly'}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-5">
                        <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4" style={{ color: '#8C8880' }} />
                            <span className="text-sm font-medium" style={{ color: '#1C1A17' }}>
                                {data?.usage.activeUsers ?? 0} / {data?.plan?.maxUsers ?? 1}
                            </span>
                            <span className="text-xs" style={{ color: '#8C8880' }}>users</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <FolderOpen className="w-4 h-4" style={{ color: '#8C8880' }} />
                            <span className="text-sm font-medium" style={{ color: '#1C1A17' }}>
                                {data?.usage.openClaims ?? 0} / {data?.plan?.maxActiveClaims ?? 10}
                            </span>
                            <span className="text-xs" style={{ color: '#8C8880' }}>open cases</span>
                        </div>

                        {hasSubscription && (
                            <button
                                onClick={handlePortal}
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                style={{ border: '1px solid #E5E2DB', color: '#5C5850', backgroundColor: '#F8F7F5' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F3F1EC'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F8F7F5'; }}
                            >
                                Manage subscription <ExternalLink className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Billing interval toggle */}
            <div className="flex items-center gap-3 mb-6">
                <div className="flex bg-white p-1 rounded-lg border border-[#E5E2DB]">
                    <button
                        onClick={() => setInterval_('monthly')}
                        className="px-4 py-1.5 text-sm font-medium rounded-md transition-all"
                        style={interval === 'monthly'
                            ? { backgroundColor: 'rgba(13,148,136,0.1)', color: '#0D9488' }
                            : { color: '#5C5850' }}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setInterval_('yearly')}
                        className="px-4 py-1.5 text-sm font-medium rounded-md transition-all"
                        style={interval === 'yearly'
                            ? { backgroundColor: 'rgba(13,148,136,0.1)', color: '#0D9488' }
                            : { color: '#5C5850' }}
                    >
                        Yearly
                    </button>
                </div>
                {interval === 'yearly' && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(13,148,136,0.12)', color: '#0D9488' }}>
                        Save ~10%
                    </span>
                )}
            </div>

            {/* Plan cards */}
            <div className="grid md:grid-cols-3 gap-5">
                {PLANS.map(plan => {
                    const price = interval === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
                    const planIdx = PLAN_ORDER.indexOf(plan.code);
                    const isCurrent = plan.code === currentCode;
                    const isCurrentInterval = isCurrent && data?.billingInterval === interval;
                    const isUpgrade = planIdx > currentIdx;
                    const isDowngrade = planIdx < currentIdx && currentCode !== 'FREE';

                    return (
                        <div
                            key={plan.code}
                            className="rounded-xl p-6 flex flex-col gap-4 transition-shadow"
                            style={{
                                backgroundColor: '#ffffff',
                                border: isCurrent
                                    ? '2px solid #0D9488'
                                    : '1px solid #E5E2DB',
                                boxShadow: plan.highlight ? '0 4px 24px rgba(0,0,0,0.06)' : undefined,
                            }}
                        >
                            {plan.highlight && (
                                <div className="-mt-6 -mx-6 mb-0 px-6 py-2 text-center text-xs font-semibold" style={{ backgroundColor: '#0D9488', color: '#F0EEE8', borderRadius: '10px 10px 0 0' }}>
                                    Most Popular
                                </div>
                            )}

                            <div>
                                <h3 className="text-base font-bold" style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#1C1A17' }}>
                                    {plan.name}
                                </h3>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-3xl font-bold" style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#1C1A17' }}>
                                        ${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}
                                    </span>
                                    <span className="text-sm" style={{ color: '#8C8880' }}>
                                        / {interval === 'yearly' ? 'yr' : 'mo'}
                                    </span>
                                </div>
                            </div>

                            <ul className="space-y-2 flex-1">
                                {plan.features.map(f => (
                                    <li key={f} className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#0D9488' }} />
                                        <span className="text-sm" style={{ color: '#5C5850' }}>{f}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            {isCurrentInterval ? (
                                <button disabled className="w-full py-2.5 rounded-lg text-sm font-semibold opacity-50 cursor-not-allowed" style={{ border: '1px solid #E5E2DB', color: '#8C8880' }}>
                                    Current plan
                                </button>
                            ) : isCurrent && !isCurrentInterval ? (
                                <button
                                    onClick={() => setModal({ type: isUpgrade ? 'upgrade' : 'subscribe', plan })}
                                    className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors"
                                    style={{ border: '1px solid #0D9488', color: '#0D9488', backgroundColor: 'transparent' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(13,148,136,0.06)'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                                >
                                    Switch to {interval === 'yearly' ? 'yearly' : 'monthly'}
                                </button>
                            ) : isUpgrade ? (
                                <button
                                    onClick={() => setModal({ type: hasSubscription ? 'upgrade' : 'subscribe', plan })}
                                    className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors"
                                    style={{ backgroundColor: '#0D9488', color: '#F0EEE8' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0F766E'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0D9488'; }}
                                >
                                    {hasSubscription ? 'Upgrade' : 'Subscribe'}
                                </button>
                            ) : isDowngrade ? (
                                <button
                                    onClick={() => setModal({ type: 'downgrade', plan })}
                                    className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors"
                                    style={{ border: '1px solid #E5E2DB', color: '#5C5850', backgroundColor: 'transparent' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F8F7F5'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                                >
                                    Downgrade
                                </button>
                            ) : (
                                <button
                                    onClick={() => setModal({ type: 'subscribe', plan })}
                                    className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors"
                                    style={{ backgroundColor: '#0D9488', color: '#F0EEE8' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0F766E'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0D9488'; }}
                                >
                                    Subscribe
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modals */}
            {modal?.type === 'subscribe' && (
                <SubscribeModal
                    planName={modal.plan.name}
                    planCode={modal.plan.code}
                    interval={interval}
                    price={interval === 'yearly' ? modal.plan.yearlyPrice : modal.plan.monthlyPrice}
                    onSuccess={handleSuccess}
                    onClose={() => setModal(null)}
                />
            )}
            {modal?.type === 'upgrade' && (
                <UpgradeConfirmModal
                    currentPlanName={currentName}
                    newPlanName={modal.plan.name}
                    newPlanCode={modal.plan.code}
                    interval={interval}
                    newPrice={interval === 'yearly' ? modal.plan.yearlyPrice : modal.plan.monthlyPrice}
                    onSuccess={handleSuccess}
                    onClose={() => setModal(null)}
                />
            )}
            {modal?.type === 'downgrade' && (
                <DowngradeModal
                    currentPlanName={currentName}
                    newPlanName={modal.plan.name}
                    newPlanCode={modal.plan.code}
                    interval={interval}
                    currentUserId={currentUserId}
                    onSuccess={handleSuccess}
                    onClose={() => setModal(null)}
                />
            )}
        </div>
    );
}
