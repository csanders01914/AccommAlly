import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

/**
 * GET /api/cases/[id]/portal-reply - Examiner fetches portal messages for a case.
 * Marks all unread PORTAL_INBOUND messages as read.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id: caseId } = await params;
    const tenantPrisma = withTenantScope(prisma, session.tenantId);

    const caseData = await tenantPrisma.case.findUnique({
      where: { id: caseId },
      select: { id: true },
    });

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const [messages] = await Promise.all([
      tenantPrisma.message.findMany({
        where: {
          caseId,
          direction: { in: ['PORTAL_INBOUND', 'PORTAL_OUTBOUND'] },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          subject: true,
          content: true,
          createdAt: true,
          direction: true,
          read: true,
          sender: { select: { name: true } },
        },
      }),
      tenantPrisma.message.updateMany({
        where: {
          caseId,
          direction: 'PORTAL_INBOUND',
          read: false,
        },
        data: { read: true },
      }),
    ]);

    const pendingCount = await tenantPrisma.task.count({
      where: {
        caseId,
        title: 'Portal Message Received',
        status: 'PENDING',
      },
    });

    return NextResponse.json({ messages, pendingCount });
  } catch (error) {
    logger.error({ err: error }, 'Get Portal Messages Error:');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/cases/[id]/portal-reply - Examiner replies to a portal message.
 * Auto-creates a note and auto-completes pending "Portal Message Received" tasks.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id: caseId } = await params;
    const { subject, content } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Reply content is required' }, { status: 400 });
    }

    const tenantPrisma = withTenantScope(prisma, session.tenantId);

    const caseData = await tenantPrisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, caseNumber: true },
    });

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const message = await tenantPrisma.message.create({
      data: {
        subject: subject || 'Reply from Examiner',
        content: content.trim(),
        caseId: caseData.id,
        tenantId: session.tenantId,
        senderId: session.id as string,
        direction: 'PORTAL_OUTBOUND',
        inInbox: false,
      },
      select: { id: true, subject: true, content: true, createdAt: true },
    });

    await tenantPrisma.note.create({
      data: {
        content: `**Portal Reply to Claimant**\n\n${subject ? `Subject: ${subject}\n\n` : ''}${content.trim()}`,
        noteType: 'PORTAL_REPLY',
        caseId: caseData.id,
        authorId: session.id as string,
        tenantId: session.tenantId,
      },
    });

    await tenantPrisma.task.updateMany({
      where: {
        caseId: caseData.id,
        title: 'Portal Message Received',
        status: 'PENDING',
      },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    logger.error({ err: error }, 'Portal Reply Error:');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
