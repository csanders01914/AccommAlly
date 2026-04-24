import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { stripe } from '@/lib/stripe';
import { decrypt, encrypt } from '@/lib/encryption';
import { signExportToken } from '@/lib/export-token';
import prisma from '@/lib/prisma';

// A PENDING record older than this is rejected — the Stripe PI will also have expired
const PENDING_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth({ request });
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const { paymentIntentId } = body as { paymentIntentId?: string };

  if (!paymentIntentId || typeof paymentIntentId !== 'string') {
    return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400 });
  }

  // ── 1. Look up the PENDING record for this tenant/user ──────────────────────
  const pendingRecords = await prisma.reportExportPayment.findMany({
    where: {
      tenantId: session.tenantId,
      userId: session.id,
      status: 'PENDING',
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const record = pendingRecords.find((r) => {
    try {
      return decrypt(r.stripePaymentIntentIdEnc) === paymentIntentId;
    } catch {
      return false;
    }
  });

  if (!record) {
    return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
  }

  // ── 2. Reject stale records ──────────────────────────────────────────────────
  if (Date.now() - record.createdAt.getTime() > PENDING_MAX_AGE_MS) {
    await prisma.reportExportPayment.update({
      where: { id: record.id },
      data: { status: 'CANCELLED' },
    });
    return NextResponse.json({ error: 'Payment session expired. Please start a new payment.' }, { status: 410 });
  }

  // ── 3. Verify with Stripe that the payment actually succeeded ────────────────
  let pi;
  try {
    pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (stripeErr: any) {
    return NextResponse.json({ error: `Stripe error: ${stripeErr.message}` }, { status: 502 });
  }

  if (pi.status !== 'succeeded') {
    return NextResponse.json(
      { error: `Payment not complete. Status: ${pi.status}` },
      { status: 402 }
    );
  }

  // ── 4. Verify Stripe metadata is bound to this session ───────────────────────
  // Ensures the PI was server-created for exactly this user and tenant — prevents
  // any attempt to submit a PI created under a different identity.
  if (pi.metadata?.tenantId !== session.tenantId || pi.metadata?.userId !== session.id) {
    return NextResponse.json({ error: 'Payment identity mismatch' }, { status: 403 });
  }

  // ── 5. Verify the amount paid matches what was quoted ────────────────────────
  // Defends against any edge case where a different PI (with a lower amount)
  // is substituted for the one issued by create-payment-intent.
  if (pi.amount !== record.amountCents) {
    return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 402 });
  }

  // ── 6. Mark record SUCCEEDED and issue signed export token ──────────────────
  await prisma.reportExportPayment.update({
    where: { id: record.id },
    data: { status: 'SUCCEEDED' },
  });

  const exportToken = signExportToken({
    userId: session.id,
    tenantId: session.tenantId,
    paymentRecordId: record.id,
  });

  return NextResponse.json({ exportToken });
}
