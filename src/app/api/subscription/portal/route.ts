import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
 const { session, error } = await requireAuth({ request, roles: ['ADMIN'] });
 if (error) return error;

 const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
 if (!tenant?.stripeCustomerId) {
 return NextResponse.json({ error: 'No billing account found' }, { status: 400 });
 }

 const origin = request.headers.get('origin') ?? 'http://localhost:3000';
 const portalSession = await stripe.billingPortal.sessions.create({
 customer: tenant.stripeCustomerId,
 return_url: `${origin}/admin/subscription`,
 });

 return NextResponse.json({ url: portalSession.url });
}
