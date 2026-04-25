import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
 const { session, error } = await requireAuth({ request, roles: ['ADMIN'] });
 if (error) return error;

 const { planCode, interval } = await request.json() as {
 planCode: string;
 interval: 'monthly' | 'yearly';
 };

 const plan = await prisma.subscriptionPlan.findUnique({ where: { code: planCode } });
 if (!plan) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

 // Resolve price ID: prefer DB value, fall back to env vars (STRIPE_PRICE_{CODE}_{INTERVAL})
 const envKey = `STRIPE_PRICE_${planCode.toUpperCase()}_${interval.toUpperCase()}`;
 const priceId = (interval === 'yearly' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly)
   ?? process.env[envKey];
 if (!priceId) return NextResponse.json({ error: 'Plan not available for billing' }, { status: 400 });

 const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
 if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

 // Ensure Stripe Customer exists
 let stripeCustomerId = tenant.stripeCustomerId;
 if (!stripeCustomerId) {
 const customer = await stripe.customers.create({
 email: session.email,
 metadata: { tenantId: session.tenantId },
 });
 stripeCustomerId = customer.id;
 await prisma.tenant.update({
 where: { id: session.tenantId },
 data: { stripeCustomerId },
 });
 }

 // Upgrade path — existing subscription, saved payment method
 if (tenant.stripeSubscriptionId) {
 await stripe.subscriptions.cancel(tenant.stripeSubscriptionId);

 const customer = await stripe.customers.retrieve(stripeCustomerId) as Stripe.Customer;
 const defaultPM = customer.invoice_settings?.default_payment_method as string | undefined;

 const subscription = await stripe.subscriptions.create({
 customer: stripeCustomerId,
 items: [{ price: priceId }],
 ...(defaultPM ? { default_payment_method: defaultPM } : {}),
 metadata: { tenantId: session.tenantId },
 });

 await prisma.tenant.update({
 where: { id: session.tenantId },
 data: { stripeSubscriptionId: subscription.id, billingInterval: interval },
 });

 const amountCents = (subscription as any).latest_invoice?.amount_due ?? 0;
 return NextResponse.json({ requiresCardInput: false, amountCents });
 }

 // Initial subscribe — collect card via Elements
 const subscription = await stripe.subscriptions.create({
 customer: stripeCustomerId,
 items: [{ price: priceId }],
 payment_behavior: 'default_incomplete',
 payment_settings: { save_default_payment_method: 'on_subscription' },
 expand: ['latest_invoice.payment_intent'],
 metadata: { tenantId: session.tenantId },
 });

 await prisma.tenant.update({
 where: { id: session.tenantId },
 data: { stripeSubscriptionId: subscription.id, billingInterval: interval },
 });

 const invoice = (subscription as any).latest_invoice;
 return NextResponse.json({
 requiresCardInput: true,
 clientSecret: invoice?.payment_intent?.client_secret ?? null,
 amountCents: invoice?.amount_due ?? 0,
 });
}
