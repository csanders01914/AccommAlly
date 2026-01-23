import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || "default_dev_secret_key_change_me");
const ALG = "HS256";

async function getPortalSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get("portal_token")?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, SECRET_KEY, { algorithms: [ALG] });
        return payload;
    } catch {
        return null;
    }
}

/**
 * GET /api/public/portal/messages - Get messages for the claimant's case
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getPortalSession();
        if (!session || session.role !== 'CLAIMANT') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const messages = await prisma.message.findMany({
            where: {
                caseId: session.caseId as string,
                direction: { in: ['PORTAL_INBOUND', 'PORTAL_OUTBOUND'] }
            },
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                subject: true,
                content: true,
                createdAt: true,
                direction: true,
                read: true
            }
        });

        return NextResponse.json({ messages });

    } catch (error) {
        console.error('Portal Messages Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/public/portal/messages - Send a message from claimant to examiner
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getPortalSession();
        if (!session || session.role !== 'CLAIMANT') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { subject, content } = await request.json();

        if (!content || content.trim().length === 0) {
            return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
        }

        // Get case info to find the examiner
        const caseData = await prisma.case.findUnique({
            where: { id: session.caseId as string },
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

        // Create the message
        const message = await prisma.message.create({
            data: {
                subject: subject || 'Portal Message',
                content: content.trim(),
                caseId: caseData.id,
                recipientId: caseData.createdById, // Send to examiner
                isExternal: false,
                direction: 'PORTAL_INBOUND', // From claimant to examiner
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
                content: `**Portal Message from Claimant**\n\n${subject ? `Subject: ${subject}\n\n` : ''}${content.trim()}`,
                noteType: 'PORTAL_MESSAGE',
                caseId: caseData.id,
                authorId: caseData.createdById // Attributed to examiner for visibility
            }
        });

        // Auto-create a Task for the examiner
        await prisma.task.create({
            data: {
                title: 'Portal Message Received',
                description: `New message from claimant (${caseData.clientName}) via portal.\n\nCase: ${caseData.caseNumber}\n\n${subject ? `Subject: ${subject}\n\n` : ''}Preview: ${content.trim().substring(0, 100)}${content.length > 100 ? '...' : ''}`,
                status: 'PENDING',
                priority: 'HIGH',
                category: 'FOLLOW_UP',
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
                caseId: caseData.id,
                assignedToId: caseData.createdById,
                createdById: caseData.createdById
            }
        });

        // Apply Inbound Rules for the Examiner
        try {
            const { applyInboundRules } = await import('@/lib/rules');
            await applyInboundRules(message.id, caseData.createdById);
        } catch (e) {
            console.error('Failed to trigger rules for portal message:', e);
        }

        return NextResponse.json({ success: true, message });

    } catch (error) {
        console.error('Portal Send Message Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
