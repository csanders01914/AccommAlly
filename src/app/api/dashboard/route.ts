import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';

export async function GET() {
    const session = await getSession();

    if (!session || typeof session.id !== 'string') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.id;

    try {
        // 1. Fetch User with Preferences
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                preferences: true,
                username: true,
                notifications: true,
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 2. Fetch Tasks Stats & Upcoming
        // We want high priority or due soon tasks for the widget
        const tasks = await prisma.task.findMany({
            where: {
                assignedToId: userId,
                status: { not: 'COMPLETED' }
            },
            orderBy: [
                { dueDate: 'asc' }
            ],
            take: 10,
            include: {
                case: {
                    select: { id: true, caseNumber: true, claimantId: true }
                }
            }
        });

        const taskStats = {
            totalPending: await prisma.task.count({ where: { assignedToId: userId, status: { not: 'COMPLETED' } } }),
            overdue: await prisma.task.count({
                where: {
                    assignedToId: userId,
                    status: { not: 'COMPLETED' },
                    dueDate: { lt: new Date() }
                }
            }),
        };

        // 3. Fetch Recent Messages
        const messages = await prisma.message.findMany({
            where: { recipientId: userId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                sender: { select: { name: true } }
            }
        });

        const unreadMessagesCount = await prisma.message.count({
            where: { recipientId: userId, read: false }
        });

        // 4. Fetch Call Requests
        // Assuming CallRequests are global or assigned? Schema says 'caseId' optional.
        // If user is Admin/Coordinator, maybe they see all? Or maybe we need an 'assignedTo' on CallRequest?
        // For now, let's show all PENDING calls to Coordinators.
        const callRequests = await prisma.callRequest.findMany({
            where: { status: 'PENDING' },
            orderBy: [
                { urgent: 'desc' }, // Urgent first
                { createdAt: 'asc' } // Oldest first
            ],
            take: 5
        });

        // 5. Recent Cases
        const recentCases = await prisma.case.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                clientName: true,
                caseNumber: true,
                status: true,
                program: true,
                createdAt: true,
            }
        });

        return NextResponse.json({
            user,
            tasks: tasks.map((t: any) => ({
                ...t,
                // Adapt for UI if needed
                claimNumber: (t as any).case?.caseNumber || 'N/A'
            })),
            taskStats,
            messages: messages.map((m: any) => ({
                id: m.id,
                sender: decrypt(m.sender.name),
                content: m.content,
                subject: m.subject,
                time: m.createdAt,
                unread: !m.read
            })),
            unreadMessagesCount,
            callRequests: callRequests.map((c: any) => ({
                ...c,
                name: decrypt(c.name),
                phoneNumber: decrypt(c.phoneNumber)
            })),
            recentCases: recentCases.map((rc: any) => ({
                ...rc,
                clientName: decrypt(rc.clientName)
            }))
        });

    } catch (error) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
