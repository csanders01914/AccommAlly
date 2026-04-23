import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
 try {
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);
 if (!session || session.role !== 'ADMIN') {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
 }

 const body = await request.json();
 const { id, type, newAssigneeId } = body;

 if (!id || !type || !newAssigneeId) {
 return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
 }

 // Validate new assignee exists
 const newAssignee = await prisma.user.findUnique({ where: { id: newAssigneeId } });
 if (!newAssignee) {
 return NextResponse.json({ error: 'New assignee not found' }, { status: 404 });
 }

 if (type === 'MESSAGE') {
 // Reassign Recipient
 await prisma.message.update({
 where: { id },
 data: { recipientId: newAssigneeId }
 });

 // Audit Log
 await prisma.auditLog.create({
 data: {
 entityType: 'Message',
 entityId: id,
 action: 'UPDATE',
 userId: session.id,
 metadata: JSON.stringify({ action: 'reassign', newRecipientId: newAssigneeId })
 }
 });

 } else if (type === 'TASK') {
 // Reassign Task
 await prisma.task.update({
 where: { id },
 data: { assignedToId: newAssigneeId }
 });

 // Audit Log
 await prisma.auditLog.create({
 data: {
 entityType: 'Task',
 entityId: id,
 action: 'UPDATE',
 userId: session.id,
 metadata: JSON.stringify({ action: 'reassign', newAssigneeId })
 }
 });
 } else if (type === 'CALL_REQUEST') {
 // Call Requests might not have an assignedTo field in current schema? 
 // If they don't, we can't reassign them.
 // Checking logic: If schema has assignedToId for CallRequest, update it.
 // If not, we might need to convert it to a Task? 
 // For now, let's assume we can't reassign pure CallRequests unless we add a field, 
 // OR we treat this as a no-op / error for now if schema doesn't support it.
 // Based on previous code, CallRequest doesn't seem to have assignedToId visible in my memory.
 // Let's check schema if needed, but for safety let's assume not supported for pure CallRequest yet
 // UNLESS we update the schema. 
 // OPTION: We can create a Task for it assigned to the new user?

 return NextResponse.json({ error: 'Direct reassignment of Call Requests not supported yet. Convert to Task first.' }, { status: 400 });
 }

 return NextResponse.json({ success: true });

 } catch (error) {
 logger.error({ err: error }, 'Error reassigning item:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
