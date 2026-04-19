import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import { parsePagination, buildPaginatedResponse } from '@/lib/pagination';
import { z } from 'zod';
import logger from '@/lib/logger';

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
        const { session, error } = await requireAuth();
        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const { searchParams } = new URL(request.url);
        const start = searchParams.get('start');
        const end = searchParams.get('end');
        const { page, limit, skip } = parsePagination(searchParams);

        const whereClause: any = {};

        if (start && end) {
            whereClause.dueDate = {
                gte: new Date(start),
                lte: new Date(end),
            };
        }

        const [total, tasks] = await Promise.all([
            tenantPrisma.task.count({ where: whereClause }),
            tenantPrisma.task.findMany({
                where: whereClause,
                orderBy: { dueDate: 'asc' },
                skip,
                take: limit,
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
                },
            }),
        ]);

        return NextResponse.json(buildPaginatedResponse(tasks, total, { page, limit, skip }));
    } catch (error) {
        logger.error({ err: error }, 'Task Fetch Error');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { session, error } = await requireAuth();
        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const body = await request.json();
        const validation = CreateTaskSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Validation Error', details: validation.error.issues }, { status: 400 });
        }

        const { title, description, priority, category, dueDate, caseId } = validation.data;

        const newTask = await tenantPrisma.task.create({
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
        await tenantPrisma.auditLog.create({
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
        logger.error({ err: error }, 'Task Create Error');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
