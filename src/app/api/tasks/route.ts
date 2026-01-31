import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';
import { z } from 'zod';

const CreateTaskSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
    category: z.enum(['MEETING', 'DEADLINE', 'FOLLOW_UP', 'DOCUMENTATION', 'OTHER']).default('OTHER'),
    dueDate: z.string().datetime().or(z.string()), // Accept ISO string or date string (will parse)
    caseId: z.string().min(1, 'Case ID is required'),
});

const GetTasksSchema = z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const start = searchParams.get('start');
        const end = searchParams.get('end');

        const whereClause: any = {};

        if (start && end) {
            whereClause.dueDate = {
                gte: new Date(start),
                lte: new Date(end),
            };
        }

        const tasks = await prisma.task.findMany({
            where: whereClause,
            orderBy: { dueDate: 'asc' },
            include: {
                case: {
                    select: { id: true, caseNumber: true, clientName: true }
                },
                assignedTo: {
                    select: { id: true, name: true }
                },
                createdBy: {
                    select: { id: true, name: true }
                }
            }
        });

        // Manually decrypt nested case data and assignee name
        const decryptedTasks = tasks.map((t: any) => {
            if (t.case && t.case.clientName) {
                t.case.clientName = decrypt(t.case.clientName);
            }
            if (t.assignedTo && t.assignedTo.name) {
                try {
                    t.assignedTo.name = decrypt(t.assignedTo.name);
                } catch (e) {
                    console.error('Failed to decrypt assignee name', e);
                    // Fallback or leave as is (likely encrypted)
                }
            }
            if (t.createdBy && t.createdBy.name) {
                try {
                    t.createdBy.name = decrypt(t.createdBy.name);
                } catch (e) {
                    console.error('Failed to decrypt creator name', e);
                }
            }
            return t;
        });

        return NextResponse.json({ tasks: decryptedTasks });
    } catch (error) {
        console.error('Task Fetch Error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validation = CreateTaskSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Validation Error', details: validation.error.issues }, { status: 400 });
        }

        const { title, description, priority, category, dueDate, caseId } = validation.data;

        const newTask = await prisma.task.create({
            data: {
                title,
                description,
                dueDate: new Date(dueDate),
                status: 'PENDING',
                priority: priority,
                category: category,
                caseId: caseId,
                assignedToId: body.assignedToId || session.id,
                createdById: session.id
            }
        });

        // Audit Log: Task Created
        await prisma.auditLog.create({
            data: {
                entityType: 'Task',
                entityId: newTask.id,
                action: 'CREATE',
                userId: session.id,
                metadata: JSON.stringify({
                    title: title,
                    priority: priority,
                    assignedTo: body.assignedToId || session.id
                })
            }
        });

        return NextResponse.json(newTask);

    } catch (error) {
        console.error('Task Create Error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
