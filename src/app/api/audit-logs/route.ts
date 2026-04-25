import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

/**
 * GET /api/audit-logs - List audit logs with filters
 */
export async function GET(request: NextRequest) {
 try {
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);
 if (!session || (session.role !== 'ADMIN' && session.role !== 'AUDITOR')) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 const { searchParams } = new URL(request.url);
 const userId = searchParams.get('userId');
 const startDate = searchParams.get('startDate');
 const endDate = searchParams.get('endDate');
 const limit = parseInt(searchParams.get('limit') || '50');
 const offset = parseInt(searchParams.get('offset') || '0');

 // Build where clause — always scoped to the authenticated tenant
 const where: any = { tenantId: session.tenantId };
 if (userId) {
 where.userId = userId;
 }
 if (startDate || endDate) {
 where.timestamp = {};
 if (startDate) where.timestamp.gte = new Date(startDate);
 if (endDate) {
 // Set end date to end of day
 const end = new Date(endDate);
 end.setHours(23, 59, 59, 999);
 where.timestamp.lte = end;
 }
 }

 // Fetch logs
 const [logs, total] = await Promise.all([
 prisma.auditLog.findMany({
 where,
 include: {
 user: {
 select: { name: true, email: true, role: true }
 }
 },
 orderBy: { timestamp: 'desc' },
 take: limit,
 skip: offset,
 }),
 prisma.auditLog.count({ where })
 ]);

 return NextResponse.json({ logs, total, limit, offset });
 } catch (error) {
 logger.error({ err: error }, 'Error fetching audit logs:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
