import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { stripe } from '@/lib/stripe';
import { decrypt, encrypt } from '@/lib/encryption';
import { signExportToken } from '@/lib/export-token';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
    const { session, error } = await requireAuth({ request });
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const { paymentIntentId } = body as { paymentIntentId?: string };

    if (!paymentIntentId || typeof paymentIntentId !== 'string') {
        return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400 });
    }

    // Look up the PENDING record for this tenant/user
    // We decrypt each stored ID to find the matching record
    // (We don't expose a plain-text PI ID index to avoid leaking it)
    const pendingRecords = await prisma.reportExportPayment.findMany({
        where: {
            tenantId: session.tenantId,
            userId: session.id,
            status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
    });

    const record = pendingRecords.find((r: typeof pendingRecords[0]) => {
        try {
            return decrypt(r.stripePaymentIntentIdEnc) === paymentIntentId;
        } catch {
            return false;
        }
    });

    if (!record) {
        return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    // Verify with Stripe that the payment actually succeeded — never trust the client alone
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

    // Update record to SUCCEEDED
    await prisma.reportExportPayment.update({
        where: { id: record.id },
        data: { status: 'SUCCEEDED' },
    });

    // Issue a short-lived signed export token (valid 5 min, retryable within window)
    const exportToken = signExportToken({
        userId: session.id,
        tenantId: session.tenantId,
        paymentRecordId: record.id,
    });

    return NextResponse.json({ exportToken });
}
