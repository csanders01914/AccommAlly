import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

export async function GET() {
 try {
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);
 if (!session || session.role !== 'ADMIN') {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 const [
 totalCases,
 activeCases,
 totalUsers,
 totalDocuments,
 recentLogs
 ] = await Promise.all([
 prisma.case.count(),
 prisma.case.count({ where: { status: { not: 'CLOSED' } } }),
 prisma.user.count(),
 prisma.document.count(),
 prisma.auditLog.findMany({
 take: 5,
 orderBy: { timestamp: 'desc' },
 include: { user: { select: { name: true } } }
 })
 ]);

 return NextResponse.json({
 stats: {
 totalCases,
 activeCases,
 totalUsers,
 totalDocuments
 },
 recentLogs
 });
 } catch (error) {
 logger.error({ err: error }, 'Admin Stats Error:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
