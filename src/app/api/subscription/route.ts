import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
 const { session, error } = await requireAuth({ roles: ['ADMIN'] });
 if (error) return error;

 const tenant = await prisma.tenant.findUnique({
 where: { id: session.tenantId },
 include: { subscriptionPlan: true },
 });

 const plan =
 tenant?.subscriptionPlan ??
 (await prisma.subscriptionPlan.findUnique({ where: { code: 'FREE' } }));

 const [activeUsers, openClaims] = await Promise.all([
 prisma.user.count({ where: { tenantId: session.tenantId, active: true } }),
 prisma.case.count({
 where: { tenantId: session.tenantId, status: { notIn: ['CLOSED', 'ARCHIVED'] } },
 }),
 ]);

 return NextResponse.json({
 plan,
 subscriptionStatus: tenant?.subscriptionStatus ?? null,
 currentPeriodEnd: tenant?.currentPeriodEnd ?? null,
 billingInterval: tenant?.billingInterval ?? null,
 usage: { activeUsers, openClaims },
 });
}
