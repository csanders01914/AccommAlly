'use client';

import { useState, useEffect } from 'react';
import { apiFetchJSON } from '@/lib/api-client';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe, StripeCardElementOptions } from '@stripe/stripe-js';
import { Loader2, Headset, CheckCircle2, Lock, ShieldCheck, ArrowRight, Calendar, Phone, User, MessageSquare } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '');

const CARD_ELEMENT_OPTIONS: StripeCardElementOptions = {
 style: {
 base: {
 color: '#F0EEE8',
 fontFamily: 'Georgia, serif',
 fontSize: '16px',
 fontSmoothing: 'antialiased',
 '::placeholder': { color: 'rgba(240,238,232,0.35)' },
 },
 invalid: { color: '#F87171', iconColor: '#F87171' },
 },
};

export default function ConsultationPage() {
 const [step, setStep] = useState<'LOADING' | 'INTRO' | 'PAYMENT' | 'FORM' | 'SUCCESS'>('LOADING');
 const [isEnterprise, setIsEnterprise] = useState(false);
 const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

 // Form data
 const [name, setName] = useState('');
 const [phoneNumber, setPhoneNumber] = useState('');
 const [availability, setAvailability] = useState('');
 const [description, setDescription] = useState('');
 const [submitting, setSubmitting] = useState(false);
 const [errorMsg, setErrorMsg] = useState<string | null>(null);

 useEffect(() => {
 apiFetchJSON<{ isEnterprise: boolean }>('/api/consultation/check-eligibility')
 .then((data) => {
 setIsEnterprise(data.isEnterprise);
 setStep('INTRO');
 })
 .catch(() => {
 setStep('INTRO'); // Allow to fail gracefully
 });
 }, []);

 const handleStart = () => {
 if (isEnterprise) {
 setStep('FORM');
 } else {
 setStep('PAYMENT');
 }
 };

 const handleFormSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setSubmitting(true);
 setErrorMsg(null);
 try {
 await apiFetchJSON('/api/consultation/submit', {
 method: 'POST',
 body: JSON.stringify({
 name,
 phoneNumber,
 availability,
 description,
 paymentIntentId
 }),
 });
 setStep('SUCCESS');
 } catch (err: any) {
 setErrorMsg(err.message ?? 'An error occurred while submitting your request.');
 } finally {
 setSubmitting(false);
 }
 };

 return (
 <div className="min-h-screen relative flex flex-col items-center justify-center p-6" style={{ backgroundColor: '#13110E', color: '#F0EEE8' }}>
 {/* Background Effects */}
 <div className="absolute inset-0 overflow-hidden pointer-events-none">
 <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20" style={{ backgroundColor: '#0D9488' }} />
 <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] opacity-10" style={{ backgroundColor: '#6366f1' }} />
 </div>

 <div className="relative z-10 w-full max-w-2xl">
 {step === 'LOADING' && (
 <div className="flex flex-col items-center gap-4 py-20">
 <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#0D9488' }} />
 <p className="tracking-wide" style={{ color: 'rgba(240,238,232,0.6)' }}>Loading your workspace...</p>
 </div>
 )}

 {step === 'INTRO' && (
 <div className="rounded-3xl p-10 overflow-hidden shadow-2xl transition-all duration-500 ease-out translate-y-0 opacity-100" style={{ backgroundColor: 'rgba(28,26,23,0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.05)' }}>
 <div className="flex justify-center mb-6">
 <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)' }}>
 <Headset className="w-8 h-8 text-white" />
 </div>
 </div>
 <h1 className="text-4xl font-bold text-center mb-4 tracking-tight" style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}>
 ADA Professional Consultation
 </h1>
 <p className="text-center text-lg mb-8" style={{ color: 'rgba(240,238,232,0.7)' }}>
 Connect with our certified ADA experts to discuss accommodations, compliance risks, and strategic decisions in a 60-minute one-on-one session.
 </p>
 
 <div className="flex flex-col items-center gap-6">
 {!isEnterprise && (
 <div className="rounded-xl px-6 py-4 w-full flex items-center justify-between" style={{ backgroundColor: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.2)' }}>
 <div>
 <p className="font-semibold" style={{ color: '#0D9488' }}>Consultation Fee</p>
 <p className="text-sm" style={{ color: 'rgba(240,238,232,0.5)' }}>One-time flat rate</p>
 </div>
 <p className="text-2xl font-bold font-serif">$50</p>
 </div>
 )}
 {isEnterprise && (
 <div className="rounded-xl px-6 py-4 w-full flex items-center gap-3" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
 <CheckCircle2 className="text-indigo-400 w-6 h-6 shrink-0" />
 <div>
 <p className="font-semibold text-indigo-400">Enterprise Benefit Applied</p>
 <p className="text-sm" style={{ color: 'rgba(240,238,232,0.5)' }}>Consultations are included at no additional cost for your workspace.</p>
 </div>
 </div>
 )}

 <button
 onClick={handleStart}
 className="group w-full py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-lg"
 style={{ background: '#F0EEE8', color: '#13110E' }}
 >
 {isEnterprise ? 'Continue to Request Form' : 'Proceed to Payment'}
 <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
 </button>
 </div>
 </div>
 )}

 {step === 'PAYMENT' && (
 <Elements stripe={stripePromise}>
 <PaymentStep 
 onSuccess={(id) => { setPaymentIntentId(id); setStep('FORM'); }} 
 onBack={() => setStep('INTRO')} 
 />
 </Elements>
 )}

 {step === 'FORM' && (
 <div className="rounded-3xl p-8 overflow-hidden shadow-2xl transition-all duration-500 ease-out" style={{ backgroundColor: 'rgba(28,26,23,0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.05)' }}>
 <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}>Request Details</h2>
 <p className="text-sm mb-6" style={{ color: 'rgba(240,238,232,0.6)' }}>Please provide your details so our expert can prepare for your session.</p>
 
 {errorMsg && (
 <div className="mb-6 p-4 rounded-xl text-sm" style={{ backgroundColor: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}>
 {errorMsg}
 </div>
 )}

 <form onSubmit={handleFormSubmit} className="space-y-5">
 <div className="space-y-1.5">
 <label className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'rgba(240,238,232,0.8)' }}><User className="w-4 h-4"/> Full Name</label>
 <input
 type="text"
 required
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="Jane Doe"
 className="w-full bg-transparent px-4 py-3 rounded-xl border focus:outline-none transition-colors"
 style={{ borderColor: 'rgba(240,238,232,0.15)', color: '#F0EEE8' }}
 onFocus={e => e.target.style.borderColor = '#0D9488'}
 onBlur={e => e.target.style.borderColor = 'rgba(240,238,232,0.15)'}
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'rgba(240,238,232,0.8)' }}><Phone className="w-4 h-4"/> Phone Number</label>
 <input
 type="tel"
 required
 value={phoneNumber}
 onChange={(e) => setPhoneNumber(e.target.value)}
 placeholder="(555) 123-4567"
 className="w-full bg-transparent px-4 py-3 rounded-xl border focus:outline-none transition-colors"
 style={{ borderColor: 'rgba(240,238,232,0.15)', color: '#F0EEE8' }}
 onFocus={e => e.target.style.borderColor = '#0D9488'}
 onBlur={e => e.target.style.borderColor = 'rgba(240,238,232,0.15)'}
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'rgba(240,238,232,0.8)' }}><Calendar className="w-4 h-4"/> Typical Availability</label>
 <input
 type="text"
 required
 value={availability}
 onChange={(e) => setAvailability(e.target.value)}
 placeholder="e.g., Tuesdays and Thursdays 1pm - 4pm EST"
 className="w-full bg-transparent px-4 py-3 rounded-xl border focus:outline-none transition-colors"
 style={{ borderColor: 'rgba(240,238,232,0.15)', color: '#F0EEE8' }}
 onFocus={e => e.target.style.borderColor = '#0D9488'}
 onBlur={e => e.target.style.borderColor = 'rgba(240,238,232,0.15)'}
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'rgba(240,238,232,0.8)' }}><MessageSquare className="w-4 h-4"/> Brief Description of Issue</label>
 <textarea
 required
 rows={4}
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder="What accommodation challenges are you currently facing?"
 className="w-full bg-transparent px-4 py-3 rounded-xl border focus:outline-none transition-colors resize-none"
 style={{ borderColor: 'rgba(240,238,232,0.15)', color: '#F0EEE8' }}
 onFocus={e => e.target.style.borderColor = '#0D9488'}
 onBlur={e => e.target.style.borderColor = 'rgba(240,238,232,0.15)'}
 />
 </div>
 <div className="pt-2">
 <button
 type="submit"
 disabled={submitting}
 className="group w-full py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
 style={{ background: '#0D9488', color: '#FFF' }}
 onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#0F766E'; }}
 onMouseLeave={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#0D9488'; }}
 >
 {submitting ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Submit Request'}
 </button>
 </div>
 </form>
 </div>
 )}

 {step === 'SUCCESS' && (
 <div className="rounded-3xl p-12 overflow-hidden shadow-2xl text-center" style={{ backgroundColor: 'rgba(28,26,23,0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.05)' }}>
 <div className="flex justify-center mb-6">
 <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(13,148,136,0.15)' }}>
 <CheckCircle2 className="w-10 h-10" style={{ color: '#0D9488' }} />
 </div>
 </div>
 <h2 className="text-4xl font-bold mb-4 tracking-tight" style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}>Request Sent</h2>
 <p className="text-lg mb-8 leading-relaxed" style={{ color: 'rgba(240,238,232,0.7)' }}>
 We have successfully received your consultation request. An ADA professional will review your details and reach out within 24 hours to schedule the meeting.
 </p>
 <button
 onClick={() => window.location.href = '/dashboard'}
 className="py-3 px-8 rounded-xl font-medium transition-all hover:bg-opacity-80"
 style={{ backgroundColor: 'rgba(240,238,232,0.1)', color: '#F0EEE8', border: '1px solid rgba(240,238,232,0.15)' }}
 >
 Return to Dashboard
 </button>
 </div>
 )}
 </div>
 </div>
 );
}

// ─── Payment Step Component ─────────────────────────────────────────────────────

function PaymentStep({ onSuccess, onBack }: { onSuccess: (piId: string) => void, onBack: () => void }) {
 const stripe = useStripe();
 const elements = useElements();
 const [clientSecret, setClientSecret] = useState<string | null>(null);
 const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'error'>('loading');
 const [errorMsg, setErrorMsg] = useState<string | null>(null);

 useEffect(() => {
 const createIntent = async () => {
 try {
 const res = await apiFetchJSON<{ clientSecret: string }>('/api/consultation/create-payment-intent', { method: 'POST' });
 setClientSecret(res.clientSecret);
 setStatus('ready');
 } catch (err: any) {
 setErrorMsg(err.message ?? 'Failed to initialize payment.');
 setStatus('error');
 }
 };
 createIntent();
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
 onSuccess(paymentIntent.id);
 }
 };

 return (
 <div className="rounded-3xl p-8 overflow-hidden shadow-2xl transition-all duration-500" style={{ backgroundColor: 'rgba(28,26,23,0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.05)' }}>
 <button onClick={onBack} className="text-sm font-medium mb-6 hover:underline" style={{ color: 'rgba(240,238,232,0.5)' }}>
 &larr; Back
 </button>
 <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}>Payment Details</h2>
 <p className="text-sm mb-6" style={{ color: 'rgba(240,238,232,0.6)' }}>Enter your card information to securely process the $50 consultation fee.</p>

 <form onSubmit={handlePay} className="space-y-6">
 <div>
 <label className="block text-sm font-medium mb-3" style={{ color: 'rgba(240,238,232,0.8)' }}>Card Information</label>
 <div
 className="rounded-xl px-4 py-4 transition-colors"
 style={{ backgroundColor: 'rgba(240,238,232,0.05)', border: '1px solid rgba(240,238,232,0.12)' }}
 >
 {status === 'loading' ? (
 <div className="flex justify-center py-1">
 <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'rgba(240,238,232,0.4)' }} />
 </div>
 ) : (
 <CardElement options={CARD_ELEMENT_OPTIONS} />
 )}
 </div>
 </div>

 {errorMsg && (
 <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}>
 {errorMsg}
 </div>
 )}

 <button
 type="submit"
 disabled={!stripe || status === 'loading' || status === 'processing'}
 className="w-full py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
 style={{ background: '#0D9488', color: '#FFF' }}
 onMouseEnter={e => { if (status === 'ready') e.currentTarget.style.backgroundColor = '#0F766E'; }}
 onMouseLeave={e => { if (status === 'ready') e.currentTarget.style.backgroundColor = '#0D9488'; }}
 >
 {status === 'processing' ? <><Loader2 className="w-5 h-5 animate-spin"/> Processing...</> : <><Lock className="w-4 h-4"/> Pay $50.00</>}
 </button>

 <div className="flex items-center justify-center gap-2 pt-2 text-xs" style={{ color: 'rgba(240,238,232,0.4)' }}>
 <ShieldCheck className="w-4 h-4" /> Secured via Stripe
 </div>
 </form>
 </div>
 );
}
