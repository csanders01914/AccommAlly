import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { stripe } from '@/lib/stripe';
import { encrypt, decrypt } from '@/lib/encryption';
import prisma from '@/lib/prisma';
import { addMonths } from 'date-fns';

const ROWS_PER_PAGE = 25;
const PRICE_PER_PAGE_CENTS = 25;
const MINIMUM_CENTS = 500;
// Reuse a PENDING intent created within this window rather than creating a duplicate
const REUSE_WINDOW_MS = 5 * 60 * 1000;
// Stripe PI expiry — reject intents older than this
const PI_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

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
    4 + expiringCount +
    8 + jobFamilyRows.length + Math.min(taxCount, 10) +
    1 + typeDistCount.length + jobRoleCount.length + denialCount.length +
    4 + 3 + Math.min(pendingMedCount, 20);

  const pageCount = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE));
  const amountCents = Math.max(MINIMUM_CENTS, pageCount * PRICE_PER_PAGE_CENTS);
  return { pageCount, amountCents };
}

export async function POST(request: NextRequest) {
  try {
  return await handlePost(request);
  } catch (err: any) {
    console.error('[reports/create-payment-intent]', err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}

async function handlePost(request: NextRequest) {
  const { session, error } = await requireAuth({ request });
  if (error) return error;

  // ── Cancel any existing PENDING intents for this user ───────────────────────
  // Prevents record accumulation and ensures the confirm-export lookup window
  // is never polluted with stale intents.
  const existingPending = await prisma.reportExportPayment.findMany({
    where: { tenantId: session.tenantId, userId: session.id, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });

  for (const record of existingPending) {
    try {
      const piId = decrypt(record.stripePaymentIntentIdEnc);
      const age = Date.now() - record.createdAt.getTime();

      // Reuse a very recent PENDING intent rather than creating a duplicate
      // (guards against double-click and quick modal close/reopen)
      if (age < REUSE_WINDOW_MS) {
        const pi = await stripe.paymentIntents.retrieve(piId);
        if (pi.status === 'requires_payment_method' || pi.status === 'requires_confirmation') {
          return NextResponse.json({
            clientSecret: pi.client_secret,
            amountCents: record.amountCents,
            pageCount: record.pageCount,
          });
        }
      }

      // Otherwise cancel the Stripe PI if it is still cancellable
      const pi = await stripe.paymentIntents.retrieve(piId);
      const cancellable: string[] = ['requires_payment_method', 'requires_confirmation', 'requires_action'];
      if (cancellable.includes(pi.status)) {
        await stripe.paymentIntents.cancel(piId);
      }
    } catch {
      // If Stripe or decryption fails, still mark the DB record stale
    }
    await prisma.reportExportPayment.update({
      where: { id: record.id },
      data: { status: 'CANCELLED' },
    });
  }

  const { pageCount, amountCents } = await calcPageCount(session.tenantId);

  // ── Create fresh Stripe PaymentIntent ───────────────────────────────────────
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      // Bind intent to this specific user/tenant so confirm-export can verify metadata
      metadata: {
        tenantId: session.tenantId,
        userId: session.id,
        amountCents: String(amountCents),
      },
    });
  } catch (stripeErr: any) {
    return NextResponse.json(
      { error: `Stripe error: ${stripeErr.message}` },
      { status: 502 }
    );
  }

  const stripePaymentIntentIdEnc = encrypt(paymentIntent.id);

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
