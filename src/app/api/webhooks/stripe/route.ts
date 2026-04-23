import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
 const body = await request.text();
 const sig = request.headers.get('stripe-signature');

 if (!sig) return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });

 let event: Stripe.Event;
 try {
 event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET ?? '');
 } catch (err: any) {
 return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
 }

 switch (event.type) {
 case 'customer.subscription.updated': {
 const sub = event.data.object as Stripe.Subscription;
 const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
 const priceId = sub.items.data[0]?.price.id;
 const interval = sub.items.data[0]?.price.recurring?.interval === 'year' ? 'yearly' : 'monthly';
 const periodEnd = (sub as any).current_period_end as number | undefined;

 const plan = priceId
 ? await prisma.subscriptionPlan.findFirst({
 where: { OR: [{ stripePriceIdMonthly: priceId }, { stripePriceIdYearly: priceId }] },
 })
 : null;

 await prisma.tenant.updateMany({
 where: { stripeCustomerId: customerId },
 data: {
 subscriptionStatus: sub.status,
 currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
 billingInterval: interval,
 ...(sub.status === 'active' && plan
 ? { planId: plan.id, plan: plan.code }
 : {}),
 },
 });
 break;
 }

 case 'customer.subscription.deleted': {
 const sub = event.data.object as Stripe.Subscription;
 const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
 const freePlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'FREE' } });

 await prisma.tenant.updateMany({
 where: { stripeCustomerId: customerId },
 data: {
 subscriptionStatus: 'canceled',
 stripeSubscriptionId: null,
 ...(freePlan ? { planId: freePlan.id, plan: 'FREE' } : {}),
 },
 });
 break;
 }

 case 'invoice.payment_failed': {
 const invoice = event.data.object as Stripe.Invoice;
 const customerId = typeof invoice.customer === 'string'
 ? invoice.customer
 : (invoice.customer as Stripe.Customer)?.id;

 if (customerId) {
 await prisma.tenant.updateMany({
 where: { stripeCustomerId: customerId },
 data: { subscriptionStatus: 'past_due' },
 });
 }
 break;
 }

 default:
 break;
 }

 return NextResponse.json({ received: true });
}
