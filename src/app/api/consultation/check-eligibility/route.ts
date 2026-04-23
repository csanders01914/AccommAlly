import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
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

 return NextResponse.json({ isEnterprise });
}
