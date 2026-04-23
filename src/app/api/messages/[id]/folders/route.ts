import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

// POST /api/messages/[id]/folders - Add message to folder(s)
export async function POST(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const { id: messageId } = await params;
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);
 if (!session) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 const { folderIds } = await request.json();

 if (!folderIds || !Array.isArray(folderIds) || folderIds.length === 0) {
 return NextResponse.json({ error: 'folderIds array is required' }, { status: 400 });
 }

 // Verify message belongs to user (as sender or recipient)
 const message = await prisma.message.findFirst({
 where: {
 id: messageId,
 OR: [
 { senderId: session.id },
 { recipientId: session.id }
 ]
 }
 });

 if (!message) {
 return NextResponse.json({ error: 'Message not found' }, { status: 404 });
 }

 // Verify all folders belong to user
 const folders = await prisma.messageFolder.findMany({
 where: {
 id: { in: folderIds },
 userId: session.id
 }
 });

 if (folders.length !== folderIds.length) {
 return NextResponse.json({ error: 'One or more folders not found' }, { status: 404 });
 }

 // Create assignments (upsert to avoid duplicates)
 await prisma.$transaction(
 folderIds.map((folderId: string) =>
 prisma.messageFolderAssignment.upsert({
 where: {
 messageId_folderId: { messageId, folderId }
 },
 create: { messageId, folderId },
 update: {}
 })
 )
 );

 return NextResponse.json({ success: true });
 } catch (error) {
 logger.error({ err: error }, 'Error adding message to folder:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}

// DELETE /api/messages/[id]/folders - Remove message from folder
export async function DELETE(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const { id: messageId } = await params;
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);
 if (!session) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 const { folderId } = await request.json();

 if (!folderId) {
 return NextResponse.json({ error: 'folderId is required' }, { status: 400 });
 }

 // Verify folder ownership
 const folder = await prisma.messageFolder.findFirst({
 where: { id: folderId, userId: session.id }
 });

 if (!folder) {
 return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
 }

 await prisma.messageFolderAssignment.deleteMany({
 where: { messageId, folderId }
 });

 return NextResponse.json({ success: true });
 } catch (error) {
 logger.error({ err: error }, 'Error removing message from folder:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
