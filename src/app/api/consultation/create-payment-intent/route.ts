import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { stripe } from '@/lib/stripe';
import { encrypt } from '@/lib/encryption';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
 const { session, error } = await requireAuth({ request });
 if (error) return error;

 const tenant = await prisma.tenant.findUnique({
 where: { id: session.tenantId },
 include: { subscriptionPlan: true },
 });

 if (!tenant) {
 return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
 }

 const isEnterprise = tenant.plan === 'ENTERPRISE' || tenant.subscriptionPlan?.code === 'ENTERPRISE';

 if (isEnterprise) {
 return NextResponse.json({ error: 'Enterprise users do not need to pay for consultations' }, { status: 400 });
 }

 const amountCents = 5000; // Flat $50

 let paymentIntent;
 try {
 paymentIntent = await stripe.paymentIntents.create({
 amount: amountCents,
 currency: 'usd',
 automatic_payment_methods: { enabled: true },
 metadata: {
 tenantId: session.tenantId,
 userId: session.id,
 type: 'consultation',
 },
 });
 } catch (stripeErr: any) {
 return NextResponse.json(
 { error: `Stripe error: ${stripeErr.message}` },
 { status: 502 }
 );
 }

 return NextResponse.json({
 clientSecret: paymentIntent.client_secret,
 amountCents,
 });
}
