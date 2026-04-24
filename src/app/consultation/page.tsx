'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetchJSON } from '@/lib/api-client';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe, StripeCardElementOptions } from '@stripe/stripe-js';
import {
  Loader2, Headset, CheckCircle2, Lock, ShieldCheck, ArrowRight,
  Calendar, Phone, User, MessageSquare, Users,
} from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '');

const CARD_ELEMENT_OPTIONS: StripeCardElementOptions = {
  style: {
    base: {
      color: '#1C1A17',
      fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
      fontSize: '15px',
      fontSmoothing: 'antialiased',
      '::placeholder': { color: 'rgba(140,136,128,0.6)' },
    },
    invalid: { color: '#DC2626', iconColor: '#DC2626' },
  },
};

// ── Left Column ──────────────────────────────────────────────────────────────

const INCLUDED_ITEMS = [
  '60-minute session with a certified ADA expert',
  'Pre-session review of your submitted details',
  'Real-time guidance on accommodation decisions',
  'Written summary of recommendations delivered after the session',
];

const HOW_IT_WORKS_STEPS = [
  {
    title: 'Submit the form',
    desc: 'Provide your availability and a brief description of your accommodation challenge.',
  },
  {
    title: 'We confirm within 24 hours',
    desc: 'An expert is matched and a session time is confirmed via phone or email.',
  },
  {
    title: 'Attend and receive a summary',
    desc: 'Join the session — a written summary of recommendations follows within 48 hours.',
  },
];

const TRUST_ITEMS = [
  { icon: Lock, label: 'Confidential & Private' },
  { icon: ShieldCheck, label: 'No commitment' },
  { icon: Users, label: 'Certified ADA Experts' },
];

function LeftColumn() {
  return (
    <div className="flex flex-col gap-10">
      {/* Icon + Headline */}
      <div>
        <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center mb-4">
          <Headset className="w-6 h-6 text-primary-500" />
        </div>
        <h1 className="font-display text-3xl text-text-primary leading-snug mb-3">
          ADA Professional Consultation
        </h1>
        <p className="text-text-secondary text-base leading-relaxed">
          Connect with our certified ADA experts for a 60-minute one-on-one session covering
          accommodations, compliance risks, and strategic decisions.
        </p>
      </div>

      {/* What's Included */}
      <div>
        <p className="form-label mb-3">What's Included</p>
        <ul className="flex flex-col gap-3">
          {INCLUDED_ITEMS.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
              <span className="text-text-secondary text-sm">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* How It Works */}
      <div>
        <p className="form-label mb-3">How It Works</p>
        <div className="flex flex-col">
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <div key={step.title} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-primary-50 text-primary-600 text-sm font-semibold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                {i < HOW_IT_WORKS_STEPS.length - 1 && (
                  <div className="w-px flex-1 bg-border my-1" />
                )}
              </div>
              <div className="pb-5">
                <p className="text-sm font-medium text-text-primary">{step.title}</p>
                <p className="text-sm text-text-muted mt-0.5">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Strip */}
      <div className="flex flex-wrap gap-6">
        {TRUST_ITEMS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary-500" />
            <span className="text-sm text-text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared Right Column Pieces ───────────────────────────────────────────────

function LoadingCard() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="bg-surface border border-border rounded-xl shadow-sm p-6 flex items-center justify-center min-h-[300px]"
    >
      <Loader2 className="w-6 h-6 animate-spin text-primary-500" aria-hidden="true" />
    </div>
  );
}

function SuccessCard() {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm p-6 flex flex-col items-center gap-4 py-10 text-center">
      <CheckCircle2 className="w-12 h-12 text-primary-500" aria-hidden="true" />
      <h2 className="font-display text-2xl text-text-primary">Request Received</h2>
      <p className="text-text-secondary text-sm leading-relaxed max-w-xs">
        We've received your request and will be in touch within 24 hours to confirm your session time.
      </p>
      <button
        onClick={() => { setNavigating(true); router.push('/dashboard'); }}
        disabled={navigating}
        className="btn-secondary mt-2"
      >
        Return to Dashboard
      </button>
    </div>
  );
}

function CardHeader({ isEnterprise }: { isEnterprise: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-text-primary">Request a Consultation</h2>
      {isEnterprise ? (
        <span className="flex items-center gap-1 bg-success/10 text-success rounded-full px-3 py-0.5 text-xs font-medium shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          Included with Enterprise
        </span>
      ) : (
        <span className="bg-primary-50 text-primary-600 border border-primary-100 rounded-full px-3 py-0.5 text-xs font-medium shrink-0">
          $50 · One-time
        </span>
      )}
    </div>
  );
}

interface FormValues {
  name: string;
  phoneNumber: string;
  availability: string;
  description: string;
}

function FormFields({
  values,
  onChange,
  disabled,
  idPrefix = 'consult',
}: {
  values: FormValues;
  onChange: (field: keyof FormValues, value: string) => void;
  disabled?: boolean;
  idPrefix?: string;
}) {
  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-name`} className="form-label flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" aria-hidden="true" /> Full Name
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          required
          autoComplete="name"
          className="form-input"
          placeholder="Jane Doe"
          value={values.name}
          onChange={(e) => onChange('name', e.target.value)}
          disabled={disabled}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-phone`} className="form-label flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5" aria-hidden="true" /> Phone Number
        </label>
        <input
          id={`${idPrefix}-phone`}
          type="tel"
          required
          autoComplete="tel"
          className="form-input"
          placeholder="(555) 123-4567"
          value={values.phoneNumber}
          onChange={(e) => onChange('phoneNumber', e.target.value)}
          disabled={disabled}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-availability`} className="form-label flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" aria-hidden="true" /> Typical Availability
        </label>
        <input
          id={`${idPrefix}-availability`}
          type="text"
          required
          className="form-input"
          placeholder="e.g., Tuesdays & Thursdays, 1–4pm EST"
          value={values.availability}
          onChange={(e) => onChange('availability', e.target.value)}
          disabled={disabled}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-description`} className="form-label flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" /> Issue Description
        </label>
        <textarea
          id={`${idPrefix}-description`}
          required
          rows={4}
          className="form-input resize-none"
          placeholder="What accommodation challenges are you currently facing?"
          value={values.description}
          onChange={(e) => onChange('description', e.target.value)}
          disabled={disabled}
        />
      </div>
    </>
  );
}

function EnterpriseCard({ onSuccess }: { onSuccess: () => void }) {
  const [values, setValues] = useState<FormValues>({
    name: '',
    phoneNumber: '',
    availability: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleChange = (field: keyof FormValues, value: string) =>
    setValues((v) => ({ ...v, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await apiFetchJSON('/api/consultation/submit', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message ?? 'An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm p-6 flex flex-col gap-5">
      <CardHeader isEnterprise />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormFields
          values={values}
          onChange={handleChange}
          disabled={submitting}
          idPrefix="enterprise"
        />
        {errorMsg && (
          <div role="alert" className="bg-danger/10 text-danger border border-danger/20 rounded-lg p-3 text-sm">
            {errorMsg}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          )}
          {submitting ? 'Submitting…' : 'Request Consultation'}
        </button>
        <p className="text-xs text-text-muted text-center flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          Your data is confidential
        </p>
      </form>
    </div>
  );
}
function PaymentCard({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [values, setValues] = useState<FormValues>({
    name: '',
    phoneNumber: '',
    availability: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    apiFetchJSON<{ clientSecret: string }>('/api/consultation/create-payment-intent', {
      method: 'POST',
    })
      .then((res) => setClientSecret(res.clientSecret))
      .catch((err: any) => setInitError(err.message ?? 'Failed to initialize payment.'));
  }, []);

  const handleChange = (field: keyof FormValues, value: string) =>
    setValues((v) => ({ ...v, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const card = elements.getElement(CardElement);
      if (!card) throw new Error('Card element not found.');

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card,
          billing_details: { name: values.name, phone: values.phoneNumber },
        },
      });

      if (error) throw new Error(error.message ?? 'Payment failed. Please try again.');
      if (paymentIntent?.status !== 'succeeded') throw new Error('Payment was not completed.');

      await apiFetchJSON('/api/consultation/submit', {
        method: 'POST',
        body: JSON.stringify({ ...values, paymentIntentId: paymentIntent.id }),
      });

      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message ?? 'An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm p-6 flex flex-col gap-5">
      <CardHeader isEnterprise={false} />

      {initError ? (
  <div role="alert" className="bg-danger/10 text-danger border border-danger/20 rounded-lg p-3 text-sm">
    {initError}
  </div>
) : (
  <div>
    <label htmlFor="payment-card" className="form-label block mb-2">
      Card Information
    </label>
    <div className="bg-surface-raised border border-border rounded-lg px-4 py-3">
      {!clientSecret ? (
        <div className="flex justify-center py-1" role="status" aria-label="Loading card fields">
          <Loader2 className="w-4 h-4 animate-spin text-text-muted" aria-hidden="true" />
        </div>
      ) : (
        <CardElement id="payment-card" options={CARD_ELEMENT_OPTIONS} />
      )}
    </div>
  </div>
)}

      <div className="border-t border-border" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormFields
          values={values}
          onChange={handleChange}
          disabled={submitting}
          idPrefix="payment"
        />
        {errorMsg && (
          <div role="alert" className="bg-danger/10 text-danger border border-danger/20 rounded-lg p-3 text-sm">
            {errorMsg}
          </div>
        )}
        <button
          type="submit"
          disabled={!stripe || !clientSecret || submitting}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Lock className="w-4 h-4" aria-hidden="true" />
          )}
          {submitting ? 'Processing…' : 'Book Consultation · $50.00'}
        </button>
        <p className="text-xs text-text-muted text-center flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          Payment secured by Stripe · Your data is confidential
        </p>
      </form>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ConsultationPage() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'success'>('loading');
  const [isEnterprise, setIsEnterprise] = useState(false);

  useEffect(() => {
    apiFetchJSON<{ isEnterprise: boolean }>('/api/consultation/check-eligibility')
      .then((data) => {
        setIsEnterprise(data.isEnterprise);
        setStatus('ready');
      })
      .catch(() => setStatus('ready'));
  }, []);

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[55fr_45fr] gap-8 md:gap-12 items-start">
        <LeftColumn />
        <div>
          {status === 'loading' && <LoadingCard />}
          {status === 'success' && <SuccessCard />}
          {status === 'ready' && (
            isEnterprise
              ? <EnterpriseCard onSuccess={() => setStatus('success')} />
              : (
                <Elements stripe={stripePromise}>
                  <PaymentCard onSuccess={() => setStatus('success')} />
                </Elements>
              )
          )}
        </div>
      </div>
    </div>
  );
}
