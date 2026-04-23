import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { stripe } from '@/lib/stripe';
import { encrypt } from '@/lib/encryption';
import prisma from '@/lib/prisma';
import { addMonths } from 'date-fns';

const ROWS_PER_PAGE = 25;
const PRICE_PER_PAGE_CENTS = 25;
const MINIMUM_CENTS = 500;

/** Shared page-count logic (inline to avoid cross-route import complexity) */
async function calcPageCount(tenantId: string): Promise<{ pageCount: number; amountCents: number }> {
 const [expiringCount, typeDistCount, jobRoleCount, denialCount, pendingMedCount, taxCount, jobFamilyRows] =
 await Promise.all([
 prisma.accommodation.count({
 where: {
 tenantId,
 reviewDate: { gte: new Date(), lte: addMonths(new Date(), 6) },
 status: 'APPROVED',
 },
 }),
 prisma.accommodation.groupBy({ by: ['type'], where: { tenantId }, _count: { id: true } }),
 prisma.case.groupBy({
 by: ['jobTitle'],
 where: { tenantId },
 _count: { id: true },
 orderBy: { _count: { id: 'desc' } },
 take: 10,
 }),
 prisma.accommodation.groupBy({
 by: ['lifecycleSubstatus'],
 where: { tenantId, status: { in: ['REJECTED', 'RESCINDED'] } },
 _count: { id: true },
 }),
 prisma.case.count({
 where: {
 tenantId,
 accommodations: { some: { lifecycleSubstatus: 'MEDICAL_NOT_SUBMITTED', status: 'PENDING' } },
 },
 }),
 prisma.accommodation.count({
 where: {
 tenantId,
 OR: [{ actualCost: { gte: 250 } }, { type: 'PHYSICAL_ACCOMMODATION' }],
 },
 }),
 prisma.accommodation.groupBy({
 by: ['caseId'],
 where: { tenantId, actualCost: { gt: 0 } },
 _count: { caseId: true },
 }),
 ]);

 const totalRows =
 4 + expiringCount + // Compliance
 8 + jobFamilyRows.length + Math.min(taxCount, 10) + // Financial
 1 + typeDistCount.length + jobRoleCount.length + denialCount.length + // Trends
 4 + 3 + Math.min(pendingMedCount, 20); // Workflow

 const pageCount = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE));
 const amountCents = Math.max(MINIMUM_CENTS, pageCount * PRICE_PER_PAGE_CENTS);
 return { pageCount, amountCents };
}

export async function POST(request: NextRequest) {
 const { session, error } = await requireAuth({ request });
 if (error) return error;

 const { pageCount, amountCents } = await calcPageCount(session.tenantId);

 // Create Stripe PaymentIntent — card data is collected entirely by Stripe Elements client-side
 let paymentIntent;
 try {
 paymentIntent = await stripe.paymentIntents.create({
 amount: amountCents,
 currency: 'usd',
 // Automatically confirm after client collects card details
 automatic_payment_methods: { enabled: true },
 metadata: {
 tenantId: session.tenantId,
 userId: session.id,
 },
 });
 } catch (stripeErr: any) {
 return NextResponse.json(
 { error: `Stripe error: ${stripeErr.message}` },
 { status: 502 }
 );
 }

 // Encrypt the Stripe PI ID before persisting — the raw ID is not stored
 const stripePaymentIntentIdEnc = encrypt(paymentIntent.id);

 // Create a PENDING payment record
 await prisma.reportExportPayment.create({
 data: {
 tenantId: session.tenantId,
 userId: session.id,
 stripePaymentIntentIdEnc,
 amountCents,
 pageCount,
 status: 'PENDING',
 },
 });

 return NextResponse.json({
 clientSecret: paymentIntent.client_secret,
 amountCents,
 pageCount,
 });
}
