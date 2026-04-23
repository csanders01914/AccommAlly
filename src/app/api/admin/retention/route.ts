import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { subYears } from 'date-fns';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import prisma from '@/lib/prisma'; // Using the shared prisma instance
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
 try {
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);

 // Security Check: Must be logged in and be an ADMIN
 if (!session || session.role !== 'ADMIN') {
 return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
 }

 logger.debug({ userId: session.id }, 'Initiating 5-Year Data Retention Policy');

 const cutoffDate = subYears(new Date(), 5);

 // Execute Deletion — scoped to this tenant only
 const result = await tenantPrisma.message.deleteMany({
 where: {
 createdAt: {
 lt: cutoffDate
 }
 }
 });

 // Audit Log: Retention Policy Executed
 await tenantPrisma.auditLog.create({
 data: {
 entityType: 'System',
 entityId: 'retention-policy',
 action: 'EXECUTE_RETENTION',
 userId: session.id,
 metadata: JSON.stringify({
 deletedCount: result.count,
 cutoffDate: cutoffDate.toISOString()
 })
 }
 });

 return NextResponse.json({
 success: true,
 deletedCount: result.count,
 message: `Retention policy executed successfully. ${result.count} messages older than 5 years were deleted.`,
 cutoffDate: cutoffDate.toISOString()
 });

 } catch (error) {
 logger.error({ err: error }, 'Error running retention policy:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
