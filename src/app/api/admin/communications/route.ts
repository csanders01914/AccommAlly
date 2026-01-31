import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'all'; // 'messages', 'rtcs', 'all'

        let messages: any[] = [];
        let rtcs: any[] = [];

        // Fetch Messages
        if (type === 'all' || type === 'messages') {
            const rawMessages = await prisma.message.findMany({
                orderBy: { createdAt: 'desc' },
                take: 50, // Pagination limits
                include: {
                    sender: { select: { id: true, name: true, email: true } },
                    recipient: { select: { id: true, name: true, email: true } }
                }
            });

            messages = rawMessages.map((m: any) => ({
                id: m.id,
                subject: m.subject,
                content: m.content, // Might want to truncate or leave full
                createdAt: m.createdAt,
                read: m.read,
                sender: m.sender ? { ...m.sender, name: decrypt(m.sender.name) } : { name: 'Unknown', email: '' },
                recipient: m.recipient ? { ...m.recipient, name: decrypt(m.recipient.name) } : { name: 'Unknown', email: '' }
            }));
        }

        // Fetch Return Call Tasks & PENDING Call Requests
        if (type === 'all' || type === 'rtcs') {
            // 1. Return Call Tasks
            const tasks = await prisma.task.findMany({
                where: {
                    category: 'PHONE_CALL',
                    status: { not: 'COMPLETED' }
                },
                include: {
                    assignedTo: { select: { id: true, name: true } },
                    case: { select: { id: true, clientName: true, caseNumber: true } }
                },
                orderBy: { dueDate: 'asc' }
            });

            const taskRtcs = tasks.map((t: any) => ({
                id: t.id,
                type: 'TASK',
                title: t.title,
                description: t.description,
                status: t.status,
                priority: t.priority,
                createdAt: t.createdAt,
                dueDate: t.dueDate,
                assignedTo: t.assignedTo ? { ...t.assignedTo, name: t.assignedTo.name } : null,
                client: t.case ? { name: decrypt(t.case.clientName), caseNumber: t.case.caseNumber } : null
            }));

            // 2. Pending Call Requests
            const callRequests = await prisma.callRequest.findMany({
                where: { status: 'PENDING' },
                orderBy: { createdAt: 'asc' }
            });

            const standardRtcs = callRequests.map((c: any) => ({
                id: c.id,
                type: 'CALL_REQUEST',
                title: 'Call Request',
                description: c.reason,
                status: c.status,
                priority: c.urgent ? 'URGENT' : 'NORMAL',
                createdAt: c.createdAt,
                dueDate: c.scheduledFor,
                assignedTo: null, // Call Requests typically unassigned until picked up
                client: { name: decrypt(c.name), caseNumber: 'N/A' } // Call requests have name directly
            }));

            rtcs = [...taskRtcs, ...standardRtcs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }

        return NextResponse.json({ messages, rtcs });

    } catch (error) {
        console.error('Error fetching admin comms:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
