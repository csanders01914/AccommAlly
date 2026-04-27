import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPortalSession } from '@/lib/portal-auth';
import { decrypt } from '@/lib/encryption';
import logger from '@/lib/logger';

async function resolveCase(session: { claimantId: string; tenantId: string }, caseId: string) {
  return prisma.case.findFirst({
    where: { id: caseId, claimantRef: session.claimantId, tenantId: session.tenantId },
    select: { id: true, createdById: true, clientName: true, caseNumber: true },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { caseId } = await params;
    const caseData = await resolveCase(session, caseId);
    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: {
        caseId: caseData.id,
        direction: { in: ['PORTAL_INBOUND', 'PORTAL_OUTBOUND'] },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, subject: true, content: true, createdAt: true, direction: true, read: true },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    logger.error({ err: error }, 'Portal Claim Messages GET Error:');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { caseId } = await params;
    const caseData = await resolveCase(session, caseId);
    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const { subject, content } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }
    if (content.length > 10000) {
      return NextResponse.json({ error: 'Message content is too long' }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        subject: subject || 'Portal Message',
        content: content.trim(),
        caseId: caseData.id,
        tenantId: session.tenantId,
        recipientId: caseData.createdById,
        isExternal: false,
        direction: 'PORTAL_INBOUND',
        inInbox: false,
      },
      select: { id: true, subject: true, content: true, createdAt: true },
    });

    // Auto-create a note on the case
    await prisma.note.create({
      data: {
        content: `**Portal Message from Claimant**\n\n${subject ? `Subject: ${subject}\n\n` : ''}${content.trim()}`,
        noteType: 'PORTAL_MESSAGE',
        caseId: caseData.id,
        authorId: caseData.createdById,
        tenantId: session.tenantId,
      },
    }).catch(() => {});

    // Auto-create a task for the examiner
    const clientName = decrypt(caseData.clientName);
    await prisma.task.create({
      data: {
        title: 'Portal Message Received',
        description: `New message from claimant (${clientName}) via portal.\n\nCase: ${caseData.caseNumber}\n${subject ? `Subject: ${subject}\n\n` : ''}Preview: ${content.trim().substring(0, 100)}${content.length > 100 ? '...' : ''}`,
        status: 'PENDING',
        priority: 'HIGH',
        category: 'FOLLOW_UP',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        caseId: caseData.id,
        assignedToId: caseData.createdById,
        createdById: caseData.createdById,
        tenantId: session.tenantId,
      },
    }).catch(() => {});

    // Apply inbound rules
    try {
      const { applyInboundRules } = await import('@/lib/rules');
      await applyInboundRules(message.id, caseData.createdById);
    } catch (e) {
      logger.error({ err: e }, 'Failed to trigger rules for portal message:');
    }

    return NextResponse.json({ success: true, message });
  } catch (error) {
    logger.error({ err: error }, 'Portal Claim Messages POST Error:');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
