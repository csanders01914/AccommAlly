import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

export async function PATCH(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const { session, error } = await requireAuth();
 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);

 const { id } = await params;
 const body = await request.json();

 // Allowed fields to update
 const { title, description, status, priority, dueDate, assignedToId } = body;

 // Verify ownership/permission - include assignee role for permission checks
 const task = await tenantPrisma.task.findUnique({
 where: { id },
 include: {
 case: { select: { id: true, caseNumber: true } },
 assignedTo: { select: { id: true, name: true, role: true } }
 }
 });
 if (!task) {
 return NextResponse.json({ error: 'Task not found' }, { status: 404 });
 }

 // Basic permission check
 if (task.assignedToId !== session.id && task.createdById !== session.id && session.role !== 'ADMIN') {
 return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 }

 // Role-based task completion restrictions
 if (status === 'COMPLETED' && task.status !== 'COMPLETED') {
 const assigneeRole = task.assignedTo?.role;

 // Auditors can only complete tasks assigned to themselves
 if (session.role === 'AUDITOR') {
 if (task.assignedToId !== session.id) {
 return NextResponse.json({
 error: 'Auditors can only complete their own tasks'
 }, { status: 403 });
 }
 }

 // Coordinators cannot complete tasks assigned to Admin or Auditor
 if (session.role === 'COORDINATOR') {
 if (assigneeRole === 'ADMIN' || assigneeRole === 'AUDITOR') {
 return NextResponse.json({
 error: 'Coordinators cannot complete Admin or Auditor tasks'
 }, { status: 403 });
 }
 }
 }

 // Check if task is being completed (status changing to COMPLETED)
 const isBeingCompleted = status === 'COMPLETED' && task.status !== 'COMPLETED';

 const updatedTask = await tenantPrisma.task.update({
 where: { id },
 data: {
 ...(title && { title }),
 ...(description && { description }),
 ...(status && { status }),
 ...(priority && { priority }),
 ...(dueDate && { dueDate: new Date(dueDate) }),
 ...(assignedToId && { assignedToId }),
 // Set completedAt when task is completed
 ...(status === 'COMPLETED' && { completedAt: new Date() }),
 // Clear completedAt if reopening task
 ...(status && status !== 'COMPLETED' && { completedAt: null }),
 }
 });

 // Audit Log: Task Updated
 await tenantPrisma.auditLog.create({
 data: {
 entityType: 'Task',
 entityId: updatedTask.id,
 action: 'UPDATE',
 userId: session.id,
 metadata: JSON.stringify({
 changes: body
 })
 }
 });

 // Auto-save note to case when task is completed
 if (isBeingCompleted && task.caseId) {
 const completedDate = new Date().toLocaleString('en-US', {
 year: 'numeric',
 month: 'short',
 day: 'numeric',
 hour: '2-digit',
 minute: '2-digit'
 });

 const noteContent = [
 `**Task Completed**`,
 ``,
 `**Task:** ${task.title}`,
 task.description ? `**Description:** ${task.description}` : null,
 `**Priority:** ${task.priority}`,
 `**Completed By:** ${session.name || 'Unknown'}`,
 `**Completed At:** ${completedDate}`
 ].filter(Boolean).join('\n');

 await tenantPrisma.note.create({
 data: {
 content: noteContent,
 noteType: 'TASK_COMPLETION',
 caseId: task.caseId,
 authorId: session.id
 }
 });
 }

 return NextResponse.json(updatedTask);

 } catch (error) {
 logger.error({ err: error }, 'Task Update Error');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}

export async function DELETE(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const { session, error } = await requireAuth();
 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);

 const { id } = await params;

 // Verify ownership
 const task = await tenantPrisma.task.findUnique({ where: { id } });
 if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

 if (task.createdById !== session.id && session.role !== 'ADMIN') {
 return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 }

 // Audit Log: Task Deleted
 await tenantPrisma.auditLog.create({
 data: {
 entityType: 'Task',
 entityId: id,
 action: 'DELETE',
 userId: session.id,
 metadata: JSON.stringify({ action: 'delete_task', title: task.title })
 }
 });

 await tenantPrisma.task.delete({ where: { id } });

 return NextResponse.json({ success: true });

 } catch (error) {
 logger.error({ err: error }, 'Task Delete Error');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
