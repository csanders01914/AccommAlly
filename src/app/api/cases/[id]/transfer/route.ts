import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import { z } from 'zod';
import logger from '@/lib/logger';

const TransferSchema = z.object({
 newOwnerId: z.string().min(1, 'New Owner ID is required'),
});

export async function POST(
 request: NextRequest,
 context: { params: Promise<{ id: string }> } // Params is a Promise in Next.js 15
) {
 try {
 const { id } = await context.params; // Await params
 const caseId = id;

 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);
 if (!session || session.role !== 'ADMIN') {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 const body = await request.json();
 const validation = TransferSchema.safeParse(body);

 if (!validation.success) {
 return NextResponse.json({ error: 'Validation Error' }, { status: 400 });
 }

 const { newOwnerId } = validation.data;

 // update all PENDING or IN_PROGRESS tasks
 const updateResult = await prisma.task.updateMany({
 where: {
 caseId: caseId,
 status: {
 in: ['PENDING', 'IN_PROGRESS']
 }
 },
 data: {
 assignedToId: newOwnerId
 }
 });

 // Log audit
 await prisma.auditLog.create({
 data: {
 entityType: 'Case',
 entityId: caseId,
 action: 'TRANSFER',
 metadata: JSON.stringify({
 newOwnerId,
 tasksTransfered: updateResult.count
 }),
 userId: session.id,
 }
 });

 return NextResponse.json({
 success: true,
 tasksTransfered: updateResult.count
 });

 } catch (error) {
 logger.error({ err: error }, 'Case Transfer Error');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
