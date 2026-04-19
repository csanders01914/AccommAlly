import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import { z } from 'zod';

const CreateMeetingSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    location: z.string().optional(),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    allDay: z.boolean().optional().default(false),
    color: z.string().optional(),
    recurrenceRule: z.string().optional(),
    recurrenceEnd: z.string().optional(),
    caseId: z.string().optional(),
    attendeeIds: z.array(z.string()).optional(),
    reminders: z.array(z.number().int().positive()).optional(),
});

// GET all meetings (with filters)
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
        const caseId = searchParams.get('caseId');

        const where: any = {};

        if (start && end) {
            where.startTime = { gte: new Date(start) };
            where.endTime = { lte: new Date(end) };
        }

        if (caseId) {
            where.caseId = caseId;
        }

        const meetings = await prisma.meeting.findMany({
            where,
            include: {
                organizer: { select: { id: true, name: true, email: true } },
                attendees: {
                    include: {
                        user: { select: { id: true, name: true, email: true } }
                    }
                },
                case: { select: { id: true, caseNumber: true, clientName: true } }
            },
            orderBy: { startTime: 'asc' }
        });

        return NextResponse.json({ meetings });

    } catch (error) {
        console.error('Meetings GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST create new meeting
export async function POST(request: NextRequest) {
    try {
        const { session, error } = await requireAuth();

        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validation = CreateMeetingSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation Error', details: validation.error.issues },
                { status: 400 }
            );
        }
        const {
            title,
            description,
            location,
            startTime,
            endTime,
            allDay,
            color,
            recurrenceRule,
            recurrenceEnd,
            caseId,
            attendeeIds,
            reminders
        } = validation.data;

        const meeting = await prisma.meeting.create({
            data: {
                title,
                description,
                location,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                allDay: allDay || false,
                color: color || '#3b82f6',
                recurrenceRule,
                recurrenceEnd: recurrenceEnd ? new Date(recurrenceEnd) : null,
                caseId,
                organizerId: (session as any).id,
                attendees: attendeeIds ? {
                    create: attendeeIds.map((userId: string) => ({ userId }))
                } : undefined
            },
            include: {
                organizer: { select: { id: true, name: true } },
                attendees: { include: { user: { select: { id: true, name: true } } } },
                case: { select: { id: true, caseNumber: true } }
            }
        });

        // Audit Log: Meeting Created
        await prisma.auditLog.create({
            data: {
                entityType: 'Meeting',
                entityId: meeting.id,
                action: 'CREATE',
                userId: (session as any).id,
                metadata: JSON.stringify({
                    title: title,
                    startTime: startTime,
                    caseId: caseId
                })
            }
        });

        // Create reminders if specified
        if (reminders && reminders.length > 0) {
            const reminderData = reminders.map((minutes: number) => ({
                type: 'EMAIL',
                triggerAt: new Date(new Date(startTime).getTime() - minutes * 60 * 1000),
                meetingId: meeting.id,
                userId: (session as any).id
            }));

            await prisma.reminder.createMany({ data: reminderData });
        }

        return NextResponse.json(meeting, { status: 201 });

    } catch (error) {
        console.error('Meetings POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
