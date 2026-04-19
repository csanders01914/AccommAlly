import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import { decrypt } from '@/lib/encryption';
import logger from '@/lib/logger';

export interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    allDay: boolean;
    type: 'meeting' | 'task' | 'call';
    color: string;
    description?: string;
    location?: string;
    caseNumber?: string;
    priority?: string;
    status?: string;
}

export async function GET(request: NextRequest) {
    try {
        const { session, error } = await requireAuth();

        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const start = searchParams.get('start');
        const end = searchParams.get('end');
        const typesParam = searchParams.get('types');

        if (!start || !end) {
            return NextResponse.json({ error: 'start and end dates required' }, { status: 400 });
        }

        const startDate = new Date(start);
        const endDate = new Date(end);
        const types = typesParam ? typesParam.split(',') : ['meeting', 'task', 'call'];

        const events: CalendarEvent[] = [];

        // Fetch Meetings
        if (types.includes('meeting')) {
            const meetings = await prisma.meeting.findMany({
                where: {
                    startTime: { gte: startDate },
                    endTime: { lte: endDate }
                },
                include: {
                    case: { select: { caseNumber: true } }
                }
            });

            meetings.forEach((m: any) => {
                events.push({
                    id: m.id,
                    title: m.title,
                    start: m.startTime.toISOString(),
                    end: m.endTime.toISOString(),
                    allDay: m.allDay,
                    type: 'meeting',
                    color: m.color,
                    description: m.description || undefined,
                    location: m.location || undefined,
                    caseNumber: m.case?.caseNumber
                });
            });
        }

        // Fetch Tasks
        if (types.includes('task')) {
            const tasks = await prisma.task.findMany({
                where: {
                    dueDate: { gte: startDate, lte: endDate }
                },
                include: {
                    case: { select: { caseNumber: true, clientName: true } }
                }
            });

            tasks.forEach((t: any) => {
                const taskStart = t.startTime || t.dueDate;
                const taskEnd = t.endTime || t.dueDate;

                events.push({
                    id: t.id,
                    title: t.title,
                    start: taskStart.toISOString(),
                    end: taskEnd.toISOString(),
                    allDay: !t.startTime,
                    type: 'task',
                    color: t.color,
                    description: t.description || undefined,
                    caseNumber: t.case?.caseNumber,
                    priority: t.priority,
                    status: t.status
                });
            });
        }

        // Fetch Return Calls (with scheduledFor)
        if (types.includes('call')) {
            const calls = await prisma.callRequest.findMany({
                where: {
                    scheduledFor: { gte: startDate, lte: endDate }
                },
                include: {
                    case: { select: { caseNumber: true } }
                }
            });

            calls.forEach((c: any) => {
                if (c.scheduledFor) {
                    // End time is 30 minutes after scheduled time
                    const endTime = new Date(c.scheduledFor.getTime() + 30 * 60 * 1000);

                    events.push({
                        id: c.id,
                        title: `Call: ${decrypt(c.name)}`,
                        start: c.scheduledFor.toISOString(),
                        end: endTime.toISOString(),
                        allDay: false,
                        type: 'call',
                        color: c.urgent ? '#dc2626' : '#ef4444',
                        description: c.reason,
                        caseNumber: c.case?.caseNumber,
                        priority: c.urgent ? 'URGENT' : 'NORMAL',
                        status: c.status
                    });
                }
            });
        }

        // Sort by start time
        events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        return NextResponse.json({ events });

    } catch (error) {
        logger.error({ err: error }, 'Calendar Events API Error:');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
