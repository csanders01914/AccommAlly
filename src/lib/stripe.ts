import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
 // In production this must be set. During build/dev without keys, we stub it out
 // so that import doesn't throw at module load time.
 console.warn('[stripe] STRIPE_SECRET_KEY is not set — Stripe calls will fail at runtime.');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder');
