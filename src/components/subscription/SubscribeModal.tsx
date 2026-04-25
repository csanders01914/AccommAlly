'use client';

import { useState, useEffect } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe, StripeCardElementOptions } from '@stripe/stripe-js';
import { X, Lock, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { apiFetchJSON } from '@/lib/api-client';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '');

const CARD_OPTIONS: StripeCardElementOptions = {
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

interface SubscribeModalProps {
 planName: string;
 planCode: string;
 interval: 'monthly' | 'yearly';
 price: number;
 onSuccess: () => void;
 onClose: () => void;
}

export function SubscribeModal(props: SubscribeModalProps) {
 return (
 <div
 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
 onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}
 role="dialog"
 aria-modal="true"
 aria-labelledby="subscribe-modal-title"
 >
 <div className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: '#1C1A17' }}>
 <div className="h-[3px] w-full" style={{ background: 'linear-gradient(to right, #0D9488, rgba(13,148,136,0.3))' }} />
 <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 30% 0%, rgba(13,148,136,0.10) 0%, transparent 60%)' }} />
 <button
 onClick={props.onClose}
 className="absolute top-4 right-4 p-1.5 rounded-full transition-colors z-20"
 style={{ color: 'rgba(240,238,232,0.4)' }}
 onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#F0EEE8'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(240,238,232,0.08)'; }}
 onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(240,238,232,0.4)'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
 aria-label="Close"
 >
 <X className="w-4 h-4" />
 </button>
 <Elements stripe={stripePromise}>
 <SubscribeForm {...props} />
 </Elements>
 </div>
 </div>
 );
}

function SubscribeForm({ planName, planCode, interval, price, onSuccess, onClose }: SubscribeModalProps) {
 const stripe = useStripe();
 const elements = useElements();
 const [clientSecret, setClientSecret] = useState<string | null>(null);
 const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'success' | 'error'>('loading');
 const [errorMsg, setErrorMsg] = useState<string | null>(null);

 useEffect(() => {
 const init = async () => {
 try {
 const data = await apiFetchJSON<{ clientSecret: string }>('/api/subscription/create', {
 method: 'POST',
 body: JSON.stringify({ planCode, interval }),
 });
 setClientSecret(data.clientSecret);
 setStatus('ready');
 } catch (err: any) {
 setErrorMsg(err.message ?? 'Could not initialise payment. Please try again.');
 setStatus('error');
 }
 };
 init();
 }, [planCode, interval]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!stripe || !elements || !clientSecret) return;
 setStatus('processing');
 setErrorMsg(null);

 const card = elements.getElement(CardElement);
 if (!card) return;

 const { error } = await stripe.confirmCardPayment(clientSecret, { payment_method: { card } });

 if (error) {
 setErrorMsg(error.message ?? 'Payment failed. Please try again.');
 setStatus('ready');
 return;
 }

 setStatus('success');
 // Poll until subscription is active, then call onSuccess
 let attempts = 0;
 const poll = async () => {
 if (attempts++ >= 15) { onSuccess(); return; }
 try {
 const res = await fetch('/api/subscription');
 const data = await res.json();
 if (data.subscriptionStatus === 'active') { onSuccess(); return; }
 } catch { /* continue polling */ }
 setTimeout(poll, 1000);
 };
 poll();
 };

 const dollars = price.toFixed(2);

 return (
 <div className="relative z-10 px-8 pt-7 pb-8 space-y-5">
 <div>
 <h2 id="subscribe-modal-title" className="text-lg font-bold" style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#F0EEE8' }}>
 Subscribe to {planName}
 </h2>
 <p className="text-sm mt-0.5" style={{ color: 'rgba(240,238,232,0.45)' }}>
 {interval === 'yearly' ? 'Billed annually' : 'Billed monthly'} · cancel anytime
 </p>
 </div>

 <div className="rounded-xl px-4 py-3.5" style={{ backgroundColor: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)' }}>
 <div className="flex items-center justify-between">
 <p className="text-sm font-medium" style={{ color: '#F0EEE8' }}>{planName} · {interval === 'yearly' ? 'Yearly' : 'Monthly'}</p>
 <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#F0EEE8' }}>${dollars}</p>
 </div>
 </div>

 {status === 'success' ? (
 <div className="flex flex-col items-center gap-2 py-6 text-center">
 <CheckCircle2 className="w-12 h-12" style={{ color: '#0D9488' }} />
 <p className="font-semibold" style={{ color: '#F0EEE8' }}>Payment successful!</p>
 <p className="text-sm" style={{ color: 'rgba(240,238,232,0.45)' }}>Activating your subscription…</p>
 </div>
 ) : (
 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(240,238,232,0.7)' }}>Card details</label>
 <div
 className="rounded-xl px-3.5 py-3"
 style={
 status === 'error' && errorMsg
 ? { backgroundColor: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)' }
 : { backgroundColor: 'rgba(240,238,232,0.05)', border: '1px solid rgba(240,238,232,0.12)' }
 }
 >
 {status === 'loading' ? (
 <div className="flex items-center gap-2 py-0.5" style={{ color: 'rgba(240,238,232,0.35)' }}>
 <Loader2 className="w-4 h-4 animate-spin" />
 <span className="text-sm">Preparing…</span>
 </div>
 ) : (
 <CardElement options={CARD_OPTIONS} />
 )}
 </div>
 </div>

 {errorMsg && (
 <p className="text-sm rounded-lg px-3 py-2" style={{ color: '#F87171', backgroundColor: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
 {errorMsg}
 </p>
 )}

 <button
 type="submit"
 disabled={!stripe || status === 'loading' || status === 'processing'}
 className="w-full py-3 px-4 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
 style={{ backgroundColor: '#0D9488', color: '#F0EEE8' }}
 onMouseEnter={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0F766E'; }}
 onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0D9488'; }}
 >
 {status === 'processing' ? (
 <><Loader2 className="w-4 h-4 animate-spin" />Processing…</>
 ) : (
 <><Lock className="w-4 h-4" />Pay ${dollars} &amp; Subscribe</>
 )}
 </button>

 <div className="flex items-center justify-center gap-4 pt-1">
 <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(240,238,232,0.3)' }}>
 <ShieldCheck className="w-3.5 h-3.5" />Secured by Stripe
 </span>
 </div>
 </form>
 )}
 </div>
 );
}
