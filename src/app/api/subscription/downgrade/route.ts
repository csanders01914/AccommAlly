import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
 const { session, error } = await requireAuth({ request, roles: ['ADMIN'] });
 if (error) return error;

 const { planCode, interval, confirm, usersToDeactivate } = await request.json() as {
 planCode: string;
 interval: 'monthly' | 'yearly';
 confirm?: boolean;
 usersToDeactivate?: string[];
 };

 const newPlan = await prisma.subscriptionPlan.findUnique({ where: { code: planCode } });
 if (!newPlan) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

 // Count open claims (CLOSED and ARCHIVED don't count)
 const openClaims = await prisma.case.count({
 where: { tenantId: session.tenantId, status: { notIn: ['CLOSED', 'ARCHIVED'] } },
 });

 if (openClaims > newPlan.maxActiveClaims) {
 return NextResponse.json({
 claimsBlocked: true,
 currentClaims: openClaims,
 maxClaims: newPlan.maxActiveClaims,
 });
 }

 const activeUsers = await prisma.user.findMany({
 where: { tenantId: session.tenantId, active: true },
 select: { id: true, name: true, role: true },
 });

 const mustDeactivateCount = Math.max(0, activeUsers.length - newPlan.maxUsers);

 // Preflight — return what the frontend needs to show
 if (!confirm) {
 if (mustDeactivateCount > 0) {
 return NextResponse.json({ usersToPickFrom: activeUsers, mustDeactivateCount });
 }
 return NextResponse.json({ ok: true });
 }

 // Actual downgrade — validate and execute
 if (mustDeactivateCount > 0) {
 const toDeactivate = usersToDeactivate ?? [];
 if (toDeactivate.length !== mustDeactivateCount) {
 return NextResponse.json(
 { error: `Must select exactly ${mustDeactivateCount} user(s) to deactivate` },
 { status: 400 }
 );
 }
 if (toDeactivate.includes(session.id)) {
 return NextResponse.json(
 { error: 'Cannot deactivate your own account' },
 { status: 400 }
 );
 }
 await prisma.user.updateMany({
 where: { id: { in: toDeactivate }, tenantId: session.tenantId },
 data: { active: false },
 });
 }

 const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });

 // Cancel existing subscription
 if (tenant?.stripeSubscriptionId) {
 await stripe.subscriptions.cancel(tenant.stripeSubscriptionId);
 }

 // Create new subscription at lower tier (skip for FREE — no price ID)
 const envKey = `STRIPE_PRICE_${planCode.toUpperCase()}_${interval.toUpperCase()}`;
 const priceId = (interval === 'yearly' ? newPlan.stripePriceIdYearly : newPlan.stripePriceIdMonthly)
   ?? process.env[envKey];
 let newSubId: string | null = null;

 if (priceId && tenant?.stripeCustomerId) {
 const customer = await stripe.customers.retrieve(tenant.stripeCustomerId) as Stripe.Customer;
 const defaultPM = customer.invoice_settings?.default_payment_method as string | undefined;
 const newSub = await stripe.subscriptions.create({
 customer: tenant.stripeCustomerId,
 items: [{ price: priceId }],
 ...(defaultPM ? { default_payment_method: defaultPM } : {}),
 metadata: { tenantId: session.tenantId },
 });
 newSubId = newSub.id;
 }

 await prisma.tenant.update({
 where: { id: session.tenantId },
 data: {
 planId: newPlan.id,
 plan: newPlan.code,
 stripeSubscriptionId: newSubId,
 billingInterval: priceId ? interval : null,
 },
 });

 return NextResponse.json({ success: true });
}
