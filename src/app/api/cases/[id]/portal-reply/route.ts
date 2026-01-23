import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * POST /api/cases/[id]/portal-reply - Examiner replies to a portal message
 * Auto-creates a note and auto-completes pending "Portal Message Received" tasks
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: caseId } = await params;
        const { subject, content } = await request.json();

        if (!content || content.trim().length === 0) {
            return NextResponse.json({ error: 'Reply content is required' }, { status: 400 });
        }

        // Verify case exists and user has access
        const caseData = await prisma.case.findUnique({
            where: { id: caseId },
            select: {
                id: true,
                createdById: true,
                clientName: true,
                caseNumber: true
            }
        });

        if (!caseData) {
            return NextResponse.json({ error: 'Case not found' }, { status: 404 });
        }

        // Create the reply message (direction: PORTAL_OUTBOUND = from examiner to claimant)
        const message = await prisma.message.create({
            data: {
                subject: subject || 'Reply from Examiner',
                content: content.trim(),
                caseId: caseData.id,
                senderId: session.id as string,
                isExternal: false,
                direction: 'PORTAL_OUTBOUND', // From examiner to claimant
            },
            select: {
                id: true,
                subject: true,
                content: true,
                createdAt: true
            }
        });

        // Auto-create a Note on the case
        await prisma.note.create({
            data: {
                content: `**Portal Reply to Claimant**\n\n${subject ? `Subject: ${subject}\n\n` : ''}${content.trim()}`,
                noteType: 'PORTAL_REPLY',
                caseId: caseData.id,
                authorId: session.id as string
            }
        });

        // Auto-complete pending "Portal Message Received" tasks for this case
        await prisma.task.updateMany({
            where: {
                caseId: caseData.id,
                title: 'Portal Message Received',
                status: 'PENDING'
            },
            data: {
                status: 'COMPLETED',
                completedAt: new Date()
            }
        });

        return NextResponse.json({ success: true, message });

    } catch (error) {
        console.error('Portal Reply Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * GET /api/cases/[id]/portal-reply - Get portal messages for a case (for examiner view)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: caseId } = await params;

        const messages = await prisma.message.findMany({
            where: {
                caseId,
                direction: { in: ['PORTAL_INBOUND', 'PORTAL_OUTBOUND'] }
            },
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                subject: true,
                content: true,
                createdAt: true,
                direction: true,
                read: true,
                sender: {
                    select: { name: true }
                }
            }
        });

        // Count pending portal tasks
        const pendingCount = await prisma.task.count({
            where: {
                caseId,
                title: 'Portal Message Received',
                status: 'PENDING'
            }
        });

        return NextResponse.json({ messages, pendingCount });

    } catch (error) {
        console.error('Get Portal Messages Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
