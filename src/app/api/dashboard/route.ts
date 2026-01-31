import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';

export async function GET() {
    let session = await getSession();

    // Dev mode bypass
    if (!session && process.env.NODE_ENV !== 'production') {
        session = { id: 'user-sarah-001', role: 'ADMIN', email: 'sarah@accessally.org' };
    }

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
                    select: { id: true, caseNumber: true, claimantRef: true }
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
        // 4. Fetch Call Requests & Return Call Tasks
        // Fetch standard CallRequests
        const callRequestsRaw = await prisma.callRequest.findMany({
            where: { status: 'PENDING' },
            orderBy: [
                { urgent: 'desc' },
                { createdAt: 'asc' }
            ],
            take: 20 // Increase limit since we are merging
        });

        // Fetch Return Call Tasks
        const returnCallTasks = await prisma.task.findMany({
            where: {
                category: 'FOLLOW_UP',
                status: { not: 'COMPLETED' },
                // assignedToId: userId // Do we only show assigned ones? Or all? 
                // Widget seems to be personal dashboard, so assignedToId makes sense.
                assignedToId: userId
            },
            include: {
                case: {
                    select: { id: true, caseNumber: true, clientName: true, clientPhone: true }
                }
            }
        });

        // Map Tasks to CallRequest interface for the widget
        const taskCallRequests = returnCallTasks.map((t: any) => ({
            id: t.id,
            name: t.case ? decrypt(t.case.clientName) : t.title,
            phoneNumber: '', // Task doesn't store phone specifically, user must look up case
            reason: t.description,
            status: t.status,
            urgent: t.priority === 'HIGH' || t.priority === 'URGENT',
            createdAt: t.createdAt.toISOString(),
            scheduledFor: t.dueDate ? t.dueDate.toISOString() : null,
            case: t.case ? {
                id: t.case.id,
                caseNumber: t.case.caseNumber,
                clientName: decrypt(t.case.clientName),
                clientPhone: decrypt(t.case.clientPhone)
            } : null,
            isTask: true // Marker for UI if needed
        }));

        // Map standard CallRequests
        const standardCallRequests = callRequestsRaw.map((c: any) => ({
            id: c.id,
            name: decrypt(c.name),
            phoneNumber: decrypt(c.phoneNumber),
            reason: c.reason,
            status: c.status,
            urgent: c.urgent,
            createdAt: c.createdAt.toISOString(),
            scheduledFor: c.scheduledFor ? c.scheduledFor.toISOString() : null,
            case: null, // Standard calls might not be linked to case yet? Or schema has checked?
            isTask: false
        }));

        // Combine and Sort
        // Prioritize Urgent, then by Scheduled Time (soonest first), then Created Time
        const allCallRequests = [...standardCallRequests, ...taskCallRequests].sort((a, b) => {
            if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
            // If scheduled, compare dates
            if (a.scheduledFor && b.scheduledFor) return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
            if (a.scheduledFor) return -1; // Scheduled comes before unscheduled? OR after? Usually scheduled is actionable.
            if (b.scheduledFor) return 1;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
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
            callRequests: allCallRequests.slice(0, 10), // Limit to top 10 for widget

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
