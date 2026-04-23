import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { stripe } from '@/lib/stripe';
import { encrypt } from '@/lib/encryption';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
 const { session, error } = await requireAuth({ request });
 if (error) return error;

 const body = await request.json().catch(() => ({}));
 const { name, phoneNumber, availability, description, paymentIntentId } = body;

 if (!name || !phoneNumber || !availability || !description) {
 return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
 }

 const tenant = await prisma.tenant.findUnique({
 where: { id: session.tenantId },
 include: { subscriptionPlan: true },
 });

 if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

 const isEnterprise = tenant.plan === 'ENTERPRISE' || tenant.subscriptionPlan?.code === 'ENTERPRISE';

 let validatedPaymentIntentEnc: string | null = null;
 let actualAmountCents: number | null = null;

 if (!isEnterprise) {
 if (!paymentIntentId) {
 return NextResponse.json({ error: 'Payment is required for this plan' }, { status: 402 });
 }

 try {
 const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
 if (pi.status !== 'succeeded') {
 return NextResponse.json({ error: `Payment not complete. Status: ${pi.status}` }, { status: 402 });
 }
 validatedPaymentIntentEnc = encrypt(pi.id);
 actualAmountCents = pi.amount;
 } catch (stripeErr: any) {
 return NextResponse.json({ error: `Stripe verification failed: ${stripeErr.message}` }, { status: 502 });
 }
 }

 // Create Request
 const requestRecord = await prisma.consultationRequest.create({
 data: {
 tenantId: session.tenantId,
 userId: session.id,
 name,
 phoneNumber,
 availability,
 description,
 status: 'SUBMITTED',
 isEnterpriseSkipped: isEnterprise,
 stripePaymentIntentIdEnc: validatedPaymentIntentEnc,
 amountCents: actualAmountCents,
 }
 });

 return NextResponse.json({ success: true });
}
