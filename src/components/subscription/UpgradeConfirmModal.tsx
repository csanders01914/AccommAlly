'use client';

import { useState } from 'react';
import { X, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { apiFetchJSON } from '@/lib/api-client';

interface UpgradeConfirmModalProps {
 currentPlanName: string;
 newPlanName: string;
 newPlanCode: string;
 interval: 'monthly' | 'yearly';
 newPrice: number;
 onSuccess: () => void;
 onClose: () => void;
}

export function UpgradeConfirmModal({
 currentPlanName,
 newPlanName,
 newPlanCode,
 interval,
 newPrice,
 onSuccess,
 onClose,
}: UpgradeConfirmModalProps) {
 const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
 const [errorMsg, setErrorMsg] = useState<string | null>(null);

 const handleUpgrade = async () => {
 setStatus('processing');
 setErrorMsg(null);
 try {
 await apiFetchJSON('/api/subscription/create', {
 method: 'POST',
 body: JSON.stringify({ planCode: newPlanCode, interval }),
 });
 setStatus('success');
 // Poll for active status
 let attempts = 0;
 const poll = async () => {
 if (attempts++ >= 15) { onSuccess(); return; }
 try {
 const res = await fetch('/api/subscription');
 const data = await res.json();
 if (data.subscriptionStatus === 'active') { onSuccess(); return; }
 } catch { /* continue */ }
 setTimeout(poll, 1000);
 };
 poll();
 } catch (err: any) {
 setErrorMsg(err.message ?? 'Upgrade failed. Please try again.');
 setStatus('error');
 }
 };

 return (
 <div
 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 "
 onClick={(e) => { if (e.target === e.currentTarget && status !== 'processing') onClose(); }}
 role="dialog"
 aria-modal="true"
 >
 <div className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: '#1C1A17' }}>
 <div className="h-[3px] w-full" style={{ background: 'linear-gradient(to right, #0D9488, rgba(13,148,136,0.3))' }} />
 <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 30% 0%, rgba(13,148,136,0.10) 0%, transparent 60%)' }} />

 {status !== 'processing' && (
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
 {status === 'success' ? (
 <div className="flex flex-col items-center gap-2 py-6 text-center">
 <CheckCircle2 className="w-12 h-12" style={{ color: '#0D9488' }} />
 <p className="font-semibold" style={{ color: '#F0EEE8' }}>Upgraded successfully!</p>
 <p className="text-sm" style={{ color: 'rgba(240,238,232,0.45)' }}>Activating your new plan…</p>
 </div>
 ) : (
 <>
 <div>
 <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#F0EEE8' }}>
 Confirm Upgrade
 </h2>
 <p className="text-sm mt-0.5" style={{ color: 'rgba(240,238,232,0.45)' }}>
 Your saved payment method will be charged immediately.
 </p>
 </div>

 <div className="flex items-center gap-3 rounded-xl px-4 py-3.5" style={{ backgroundColor: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)' }}>
 <span className="text-sm font-medium" style={{ color: 'rgba(240,238,232,0.6)' }}>{currentPlanName}</span>
 <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: '#0D9488' }} />
 <span className="text-sm font-semibold" style={{ color: '#F0EEE8' }}>{newPlanName}</span>
 <span className="ml-auto text-lg font-bold" style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#F0EEE8' }}>
 ${newPrice.toFixed(2)}
 </span>
 </div>

 {errorMsg && (
 <p className="text-sm rounded-lg px-3 py-2" style={{ color: '#F87171', backgroundColor: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
 {errorMsg}
 </p>
 )}

 <div className="flex gap-3">
 <button
 onClick={onClose}
 disabled={status === 'processing'}
 className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-opacity disabled:opacity-40"
 style={{ backgroundColor: 'rgba(240,238,232,0.08)', color: 'rgba(240,238,232,0.7)', border: '1px solid rgba(240,238,232,0.12)' }}
 >
 Cancel
 </button>
 <button
 onClick={handleUpgrade}
 disabled={status === 'processing'}
 className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
 style={{ backgroundColor: '#0D9488', color: '#F0EEE8' }}
 onMouseEnter={e => { if (status !== 'processing') (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0F766E'; }}
 onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0D9488'; }}
 >
 {status === 'processing' ? (
 <><Loader2 className="w-4 h-4 animate-spin" />Upgrading…</>
 ) : 'Confirm Upgrade'}
 </button>
 </div>
 </>
 )}
 </div>
 </div>
 </div>
 );
}
