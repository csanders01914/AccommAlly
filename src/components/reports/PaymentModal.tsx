'use client';

import { useState, useEffect, useRef } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe, StripeCardElementOptions } from '@stripe/stripe-js';
import { X, Lock, ShieldCheck, CreditCard, Loader2, CheckCircle2 } from 'lucide-react';
import { apiFetch, apiFetchJSON } from '@/lib/api-client';

// ─── Stripe promise (lazy-loaded once) ────────────────────────────────────────
const stripePromise = loadStripe(
 process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''
);

const CARD_ELEMENT_OPTIONS: StripeCardElementOptions = {
 style: {
 base: {
 color: '#F0EEE8',
 fontFamily: 'Georgia, serif',
 fontSize: '15px',
 fontSmoothing: 'antialiased',
 '::placeholder': { color: 'rgba(240,238,232,0.35)' },
 },
 invalid: { color: '#F87171', iconColor: '#F87171' },
 },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface PriceInfo {
 pageCount: number;
 amountCents: number;
 amountDisplay: string;
}

interface PaymentModalProps {
 priceInfo: PriceInfo;
 onSuccess: (exportToken: string) => void;
 onClose: () => void;
}

// ─── Outer wrapper — provides Stripe context ──────────────────────────────────

export function PaymentModal({ priceInfo, onSuccess, onClose }: PaymentModalProps) {
 return (
 <div
 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
 onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
 role="dialog"
 aria-modal="true"
 aria-labelledby="payment-modal-title"
 >
 <div className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: '#1C1A17' }}>
 {/* Teal accent line */}
 <div className="h-[3px] w-full" style={{ background: 'linear-gradient(to right, #0D9488, rgba(13,148,136,0.3))' }} />

 {/* Subtle radial glow */}
 <div
 className="absolute inset-0 pointer-events-none"
 style={{ backgroundImage: 'radial-gradient(ellipse at 30% 0%, rgba(13,148,136,0.10) 0%, transparent 60%)' }}
 />

 {/* Close */}
 <button
 id="payment-modal-close"
 onClick={onClose}
 className="absolute top-4 right-4 p-1.5 rounded-full transition-colors"
 style={{ color: 'rgba(240,238,232,0.4)' }}
 onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#F0EEE8'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(240,238,232,0.08)'; }}
 onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(240,238,232,0.4)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
 aria-label="Close"
 >
 <X className="w-4 h-4" />
 </button>

 <Elements stripe={stripePromise}>
 <CheckoutForm priceInfo={priceInfo} onSuccess={onSuccess} onClose={onClose} />
 </Elements>
 </div>
 </div>
 );
}

// ─── Inner form — must be inside <Elements> ───────────────────────────────────

function CheckoutForm({ priceInfo, onSuccess, onClose }: PaymentModalProps) {
 const stripe = useStripe();
 const elements = useElements();
 const [clientSecret, setClientSecret] = useState<string | null>(null);
 const [status, setStatus] = useState<'idle' | 'loading-intent' | 'ready' | 'processing' | 'success' | 'error'>('loading-intent');
 const [errorMsg, setErrorMsg] = useState<string | null>(null);
 // Guard against React StrictMode double-invoke and rapid modal close/reopen
 const intentCreated = useRef(false);

 // Create PaymentIntent once per mount — the server will reuse any recent
 // pending intent or cancel stale ones before issuing a fresh one.
 useEffect(() => {
 if (intentCreated.current) return;
 intentCreated.current = true;
 const create = async () => {
 try {
 const data = await apiFetchJSON<{ clientSecret: string }>(
 '/api/reports/create-payment-intent',
 { method: 'POST', body: JSON.stringify({}) }
 );
 setClientSecret(data.clientSecret);
 setStatus('ready');
 } catch (err: any) {
 setErrorMsg(err.message ?? 'Could not initialise payment. Please try again.');
 setStatus('error');
 }
 };
 create();
 }, []);

 const handlePay = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!stripe || !elements || !clientSecret) return;
 if (status === 'processing' || status === 'success') return;

 setStatus('processing');
 setErrorMsg(null);

 const card = elements.getElement(CardElement);
 if (!card) return;

 const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
 payment_method: { card },
 });

 if (stripeError) {
 setErrorMsg(stripeError.message ?? 'Payment failed. Please try again.');
 setStatus('ready');
 return;
 }

 if (paymentIntent?.status === 'succeeded') {
 try {
 const { exportToken } = await apiFetchJSON<{ exportToken: string }>(
 '/api/reports/confirm-export',
 {
 method: 'POST',
 body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
 }
 );
 setStatus('success');
 // Short delay so user sees the success state, then trigger download
 setTimeout(() => onSuccess(exportToken), 800);
 } catch (err: any) {
 setErrorMsg(err.message ?? 'Payment confirmed but could not issue export token.');
 setStatus('error');
 }
 }
 };

 const dollars = (priceInfo.amountCents / 100).toFixed(2);

 return (
 <div className="relative z-10 px-8 pt-7 pb-8 space-y-5">
 {/* Header */}
 <div className="flex items-start gap-3">
 <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.25)' }}>
 <CreditCard className="w-5 h-5" style={{ color: '#0D9488' }} />
 </div>
 <div>
 <h2 id="payment-modal-title" className="text-lg font-bold" style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#F0EEE8' }}>
 Export Reports
 </h2>
 <p className="text-sm mt-0.5" style={{ color: 'rgba(240,238,232,0.45)' }}>
 One-time charge · download starts immediately
 </p>
 </div>
 </div>

 {/* Price summary */}
 <div className="rounded-xl px-4 py-3.5" style={{ backgroundColor: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)' }}>
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs uppercase tracking-wide font-medium" style={{ color: '#0D9488' }}>
 Estimated pages
 </p>
 <p className="text-sm font-medium mt-0.5" style={{ color: '#F0EEE8' }}>
 {priceInfo.pageCount} page{priceInfo.pageCount !== 1 ? 's' : ''} × $0.25
 <span className="font-normal" style={{ color: 'rgba(240,238,232,0.35)' }}> (min $5.00)</span>
 </p>
 </div>
 <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#F0EEE8' }}>${dollars}</p>
 </div>
 </div>

 {/* Card form / states */}
 {status === 'success' ? (
 <div className="flex flex-col items-center gap-2 py-6 text-center">
 <CheckCircle2 className="w-12 h-12" style={{ color: '#0D9488' }} />
 <p className="font-semibold" style={{ color: '#F0EEE8' }}>Payment successful!</p>
 <p className="text-sm" style={{ color: 'rgba(240,238,232,0.45)' }}>Preparing your download…</p>
 </div>
 ) : (
 <form onSubmit={handlePay} className="space-y-4">
 {/* Card input */}
 <div>
 <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(240,238,232,0.7)' }}>
 Card details
 </label>
 <div
 className="rounded-xl px-3.5 py-3 transition-colors"
 style={
 status === 'error' && errorMsg
 ? { backgroundColor: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)' }
 : { backgroundColor: 'rgba(240,238,232,0.05)', border: '1px solid rgba(240,238,232,0.12)' }
 }
 >
 {status === 'loading-intent' ? (
 <div className="flex items-center gap-2 py-0.5" style={{ color: 'rgba(240,238,232,0.35)' }}>
 <Loader2 className="w-4 h-4 animate-spin" />
 <span className="text-sm">Preparing payment…</span>
 </div>
 ) : (
 <CardElement options={CARD_ELEMENT_OPTIONS} />
 )}
 </div>
 </div>

 {/* Error */}
 {errorMsg && (
 <p className="text-sm rounded-lg px-3 py-2" style={{ color: '#F87171', backgroundColor: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
 {errorMsg}
 </p>
 )}

 {/* Pay button */}
 <button
 id="payment-modal-pay-btn"
 type="submit"
 disabled={!stripe || status === 'loading-intent' || status === 'processing'}
 className="w-full py-3 px-4 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
 style={{ backgroundColor: '#0D9488', color: '#F0EEE8' }}
 onMouseEnter={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0F766E'; }}
 onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0D9488'; }}
 >
 {status === 'processing' ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin" />
 Processing…
 </>
 ) : (
 <>
 <Lock className="w-4 h-4" />
 Pay ${dollars} &amp; Download
 </>
 )}
 </button>

 {/* Security note */}
 <div className="flex items-center justify-center gap-4 pt-1">
 <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(240,238,232,0.3)' }}>
 <ShieldCheck className="w-3.5 h-3.5" />
 Secured by Stripe
 </span>
 <span style={{ color: 'rgba(240,238,232,0.12)' }}>|</span>
 <span className="text-xs" style={{ color: 'rgba(240,238,232,0.3)' }}>
 No card data stored by AccommAlly
 </span>
 </div>

 {/* Subscription upsell */}
 <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-3" style={{ backgroundColor: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)' }}>
 <div>
 <p className="text-xs font-medium" style={{ color: '#0D9488' }}>
 Avoid per-export charges
 </p>
 <p className="text-xs mt-0.5" style={{ color: 'rgba(240,238,232,0.4)' }}>
 Subscribe to a monthly plan and export unlimited reports with no per-use fees.
 </p>
 </div>
 <a
 href="/admin/subscription"
 className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
 style={{ backgroundColor: '#0D9488', color: '#F0EEE8' }}
 onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#0F766E'; }}
 onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#0D9488'; }}
 >
 View Plans
 </a>
 </div>
 </form>
 )}
 </div>
 );
}
