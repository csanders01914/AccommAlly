import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

export async function PATCH(
 request: NextRequest,
 context: { params: Promise<{ id: string }> }
) {
 try {
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);
 if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

 const { id } = await context.params;
 const body = await request.json();
 const { read, starred, archived } = body;

 // Verify ownership (recipient or sender can update certain fields)
 const message = await prisma.message.findUnique({
 where: { id }
 });

 if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

 // Only recipient can mark as read/starred/archived
 if (message.recipientId !== session.id && message.senderId !== session.id) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
 }

 const updateData: any = {};
 if (read !== undefined) updateData.read = read;
 if (starred !== undefined) updateData.starred = starred;
 if (archived !== undefined) updateData.archived = archived;

 const updated = await prisma.message.update({
 where: { id },
 data: updateData
 });

 return NextResponse.json(updated);
 } catch (error) {
 logger.error({ err: error }, 'Message Update Error:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}

export async function DELETE(
 request: NextRequest,
 context: { params: Promise<{ id: string }> }
) {
 try {
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);
 if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

 const { id } = await context.params;

 const message = await prisma.message.findUnique({
 where: { id }
 });

 if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

 const isSender = message.senderId === session.id;
 const isRecipient = message.recipientId === session.id;

 // Perform Soft Delete
 if (isSender) {
 await prisma.message.update({
 where: { id },
 data: { deletedBySender: true }
 });
 }

 if (isRecipient) {
 // Check if already in trash
 if (message.inTrash) {
 // Hard delete (hide permanently)
 await prisma.message.update({
 where: { id },
 data: { deletedByRecipient: true }
 });
 } else {
 // Soft delete (move to trash)
 await prisma.message.update({
 where: { id },
 data: {
 inTrash: true,
 trashDate: new Date(),
 inInbox: false,
 inJunk: false,
 archived: false,
 deletedByRecipient: false // Ensure visible in trash
 }
 });
 }
 }

 // NOTE: We do NOT hard delete even if both are true, per 5-year retention policy.

 return NextResponse.json({ success: true });
 } catch (error) {
 logger.error({ err: error }, 'Message Delete Error:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
