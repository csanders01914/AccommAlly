import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET all meetings (with filters)
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
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
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
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
        } = body;

        if (!title || !startTime || !endTime) {
            return NextResponse.json(
                { error: 'title, startTime, and endTime are required' },
                { status: 400 }
            );
        }

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
