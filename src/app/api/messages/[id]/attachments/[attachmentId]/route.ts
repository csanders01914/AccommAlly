import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import logger from '@/lib/logger';

export async function GET(
 _request: NextRequest,
 { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
 try {
 const { session, error } = await requireAuth();
 if (error) return error;

 const { id: messageId, attachmentId } = await params;

 const attachment = await prisma.messageAttachment.findUnique({
 where: { id: attachmentId },
 include: { message: { select: { tenantId: true, senderId: true, recipientId: true } } },
 });

 if (
 !attachment ||
 attachment.message.tenantId !== session.tenantId ||
 attachment.messageId !== messageId
 ) {
 return NextResponse.json({ error: 'Not found' }, { status: 404 });
 }

 const safeName = attachment.filename.replace(/[^\w.\-]/g, '_');
 return new NextResponse(attachment.data, {
 headers: {
 'Content-Type': attachment.mimeType,
 'Content-Disposition': `attachment; filename="${safeName}"`,
 'Content-Length': String(attachment.size),
 },
 });
 } catch (err) {
 logger.error({ err: err }, 'Attachment download error:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
