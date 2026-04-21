'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Users, Loader2, CheckCircle2 } from 'lucide-react';
import { apiFetchJSON } from '@/lib/api-client';

interface ActiveUser {
    id: string;
    name: string;
    role: string;
}

interface DowngradeModalProps {
    currentPlanName: string;
    newPlanName: string;
    newPlanCode: string;
    interval: 'monthly' | 'yearly';
    currentUserId: string;
    onSuccess: () => void;
    onClose: () => void;
}

type ModalState =
    | { type: 'loading' }
    | { type: 'claims-blocked'; currentClaims: number; maxClaims: number }
    | { type: 'user-picker'; users: ActiveUser[]; mustDeactivateCount: number }
    | { type: 'simple-confirm' }
    | { type: 'processing' }
    | { type: 'success' };

export function DowngradeModal({
    currentPlanName,
    newPlanName,
    newPlanCode,
    interval,
    currentUserId,
    onSuccess,
    onClose,
}: DowngradeModalProps) {
    const [state, setState] = useState<ModalState>({ type: 'loading' });
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        const preflight = async () => {
            try {
                const data = await apiFetchJSON<any>('/api/subscription/downgrade', {
                    method: 'POST',
                    body: JSON.stringify({ planCode: newPlanCode, interval }),
                });
                if (data.claimsBlocked) {
                    setState({ type: 'claims-blocked', currentClaims: data.currentClaims, maxClaims: data.maxClaims });
                } else if (data.usersToPickFrom) {
                    setState({ type: 'user-picker', users: data.usersToPickFrom, mustDeactivateCount: data.mustDeactivateCount });
                } else {
                    setState({ type: 'simple-confirm' });
                }
            } catch (err: any) {
                setState({ type: 'claims-blocked', currentClaims: 0, maxClaims: 0 }); // fallback to blocked on error
            }
        };
        preflight();
    }, [newPlanCode, interval]);

    const toggleUser = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleConfirm = async (usersToDeactivate?: string[]) => {
        setState({ type: 'processing' });
        setErrorMsg(null);
        try {
            await apiFetchJSON('/api/subscription/downgrade', {
                method: 'POST',
                body: JSON.stringify({
                    planCode: newPlanCode,
                    interval,
                    confirm: true,
                    usersToDeactivate: usersToDeactivate ?? [],
                }),
            });
            setState({ type: 'success' });
            setTimeout(onSuccess, 1200);
        } catch (err: any) {
            setErrorMsg(err.message ?? 'Downgrade failed. Please try again.');
            setState({ type: 'simple-confirm' }); // reset to allow retry
        }
    };

    const canClose = state.type !== 'processing' && state.type !== 'success';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget && canClose) onClose(); }}
            role="dialog"
            aria-modal="true"
        >
            <div className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: '#1C1A17' }}>
                <div className="h-[3px] w-full" style={{ background: 'linear-gradient(to right, rgba(248,113,113,0.8), rgba(248,113,113,0.3))' }} />
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 30% 0%, rgba(248,113,113,0.06) 0%, transparent 60%)' }} />

                {canClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-full transition-colors z-10"
                        style={{ color: 'rgba(240,238,232,0.4)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#F0EEE8'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(240,238,232,0.08)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(240,238,232,0.4)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}

                <div className="relative z-10 px-8 pt-7 pb-8 space-y-5">
                    {state.type === 'loading' && (
                        <div className="flex flex-col items-center gap-3 py-8">
                            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0D9488' }} />
                            <p className="text-sm" style={{ color: 'rgba(240,238,232,0.45)' }}>Checking downgrade eligibility…</p>
                        </div>
                    )}

                    {state.type === 'claims-blocked' && (
                        <>
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.25)' }}>
                                    <AlertTriangle className="w-5 h-5" style={{ color: '#F87171' }} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#F0EEE8' }}>
                                        Cannot Downgrade
                                    </h2>
                                    <p className="text-sm mt-0.5" style={{ color: 'rgba(240,238,232,0.45)' }}>
                                        You have too many open cases for this plan.
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-xl px-4 py-3.5" style={{ backgroundColor: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm" style={{ color: 'rgba(240,238,232,0.7)' }}>Open cases</p>
                                    <p className="text-sm font-semibold" style={{ color: '#F87171' }}>
                                        {state.currentClaims} / {state.maxClaims} allowed on {newPlanName}
                                    </p>
                                </div>
                                <p className="text-xs mt-2" style={{ color: 'rgba(240,238,232,0.35)' }}>
                                    Close or archive {state.currentClaims - state.maxClaims} case{state.currentClaims - state.maxClaims !== 1 ? 's' : ''} before downgrading.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full py-2.5 rounded-xl text-sm font-medium"
                                style={{ backgroundColor: 'rgba(240,238,232,0.08)', color: 'rgba(240,238,232,0.7)', border: '1px solid rgba(240,238,232,0.12)' }}
                            >
                                Close
                            </button>
                        </>
                    )}

                    {state.type === 'user-picker' && (
                        <>
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.25)' }}>
                                    <Users className="w-5 h-5" style={{ color: '#0D9488' }} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#F0EEE8' }}>
                                        Select Users to Deactivate
                                    </h2>
                                    <p className="text-sm mt-0.5" style={{ color: 'rgba(240,238,232,0.45)' }}>
                                        {newPlanName} allows {state.users.length - state.mustDeactivateCount} user{state.users.length - state.mustDeactivateCount !== 1 ? 's' : ''}. Select {state.mustDeactivateCount} to deactivate.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {state.users.map(user => {
                                    const isSelf = user.id === currentUserId;
                                    const isChecked = selected.has(user.id);
                                    return (
                                        <label
                                            key={user.id}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${isSelf ? 'opacity-40 cursor-not-allowed' : ''}`}
                                            style={{
                                                backgroundColor: isChecked ? 'rgba(248,113,113,0.08)' : 'rgba(240,238,232,0.04)',
                                                border: `1px solid ${isChecked ? 'rgba(248,113,113,0.25)' : 'rgba(240,238,232,0.08)'}`,
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                disabled={isSelf}
                                                onChange={() => !isSelf && toggleUser(user.id)}
                                                className="w-4 h-4 rounded"
                                                style={{ accentColor: '#F87171' }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate" style={{ color: '#F0EEE8' }}>
                                                    {user.name}
                                                    {isSelf && <span className="ml-2 text-xs" style={{ color: 'rgba(240,238,232,0.4)' }}>(you)</span>}
                                                </p>
                                                <p className="text-xs capitalize" style={{ color: 'rgba(240,238,232,0.4)' }}>{user.role.toLowerCase().replace('_', ' ')}</p>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>

                            <p className="text-xs text-center" style={{ color: selected.size === state.mustDeactivateCount ? '#0D9488' : 'rgba(240,238,232,0.35)' }}>
                                {selected.size} / {state.mustDeactivateCount} selected
                            </p>

                            {errorMsg && (
                                <p className="text-sm rounded-lg px-3 py-2" style={{ color: '#F87171', backgroundColor: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                                    {errorMsg}
                                </p>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                                    style={{ backgroundColor: 'rgba(240,238,232,0.08)', color: 'rgba(240,238,232,0.7)', border: '1px solid rgba(240,238,232,0.12)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleConfirm([...selected])}
                                    disabled={selected.size !== state.mustDeactivateCount}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: '#F87171', color: '#1C1A17' }}
                                >
                                    Downgrade
                                </button>
                            </div>
                        </>
                    )}

                    {state.type === 'simple-confirm' && (
                        <>
                            <div>
                                <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#F0EEE8' }}>
                                    Downgrade to {newPlanName}?
                                </h2>
                                <p className="text-sm mt-0.5" style={{ color: 'rgba(240,238,232,0.45)' }}>
                                    From {currentPlanName}. Your new limits take effect immediately.
                                </p>
                            </div>

                            {errorMsg && (
                                <p className="text-sm rounded-lg px-3 py-2" style={{ color: '#F87171', backgroundColor: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                                    {errorMsg}
                                </p>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                                    style={{ backgroundColor: 'rgba(240,238,232,0.08)', color: 'rgba(240,238,232,0.7)', border: '1px solid rgba(240,238,232,0.12)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleConfirm([])}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                                    style={{ backgroundColor: '#F87171', color: '#1C1A17' }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                                >
                                    Confirm Downgrade
                                </button>
                            </div>
                        </>
                    )}

                    {state.type === 'processing' && (
                        <div className="flex flex-col items-center gap-3 py-8">
                            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0D9488' }} />
                            <p className="text-sm" style={{ color: 'rgba(240,238,232,0.45)' }}>Processing downgrade…</p>
                        </div>
                    )}

                    {state.type === 'success' && (
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                            <CheckCircle2 className="w-12 h-12" style={{ color: '#0D9488' }} />
                            <p className="font-semibold" style={{ color: '#F0EEE8' }}>Downgrade successful!</p>
                            <p className="text-sm" style={{ color: 'rgba(240,238,232,0.45)' }}>Updating your plan…</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
