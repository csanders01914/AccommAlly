'use client';

import { useState, useEffect } from 'react';
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
            color: '#1C1A17',
            fontFamily: '"Inter", system-ui, sans-serif',
            fontSize: '15px',
            fontSmoothing: 'antialiased',
            '::placeholder': { color: '#8C8880' },
        },
        invalid: { color: '#dc2626', iconColor: '#dc2626' },
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
        >
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Gradient banner */}
                <div className="h-1.5 w-full bg-gradient-to-r from-[#0D9488] via-[#6366f1] to-[#8b5cf6]" />

                {/* Close */}
                <button
                    id="payment-modal-close"
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
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

    // Create PaymentIntent on mount
    useEffect(() => {
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
        <div className="px-8 pt-7 pb-8 space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0D9488]/10 to-[#6366f1]/10 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-[#0D9488]" />
                </div>
                <div>
                    <h2 id="payment-modal-title" className="text-lg font-bold text-gray-900">
                        Export Reports
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        One-time charge · download starts immediately
                    </p>
                </div>
            </div>

            {/* Price summary */}
            <div className="rounded-xl bg-gradient-to-r from-[#0D9488]/5 to-[#6366f1]/5 border border-[#0D9488]/20 px-4 py-3.5">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                            Estimated pages
                        </p>
                        <p className="text-sm text-gray-700 font-medium">
                            {priceInfo.pageCount} page{priceInfo.pageCount !== 1 ? 's' : ''} × $0.25
                            <span className="text-gray-400 font-normal"> (min $5.00)</span>
                        </p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">${dollars}</p>
                </div>
            </div>

            {/* Card form / states */}
            {status === 'success' ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <CheckCircle2 className="w-12 h-12 text-[#0D9488]" />
                    <p className="font-semibold text-gray-900">Payment successful!</p>
                    <p className="text-sm text-gray-500">Preparing your download…</p>
                </div>
            ) : (
                <form onSubmit={handlePay} className="space-y-4">
                    {/* Card input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Card details
                        </label>
                        <div className={`rounded-xl border px-3.5 py-3 transition-colors ${
                            status === 'error' && errorMsg ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                        }`}>
                            {status === 'loading-intent' ? (
                                <div className="flex items-center gap-2 text-gray-400 py-0.5">
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
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            {errorMsg}
                        </p>
                    )}

                    {/* Pay button */}
                    <button
                        id="payment-modal-pay-btn"
                        type="submit"
                        disabled={!stripe || status === 'loading-intent' || status === 'processing'}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#6366f1] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Secured by Stripe
                        </span>
                        <span className="text-gray-200">|</span>
                        <span className="text-xs text-gray-400">
                            No card data stored by AccommAlly
                        </span>
                    </div>
                </form>
            )}
        </div>
    );
}
