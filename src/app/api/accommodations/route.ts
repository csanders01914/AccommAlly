
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import { LifecycleStatus, LifecycleSubstatus, AccommodationStatus } from '@prisma/client';
import { z } from 'zod';
import logger from '@/lib/logger';

const CreateAccommodationSchema = z.object({
    caseId: z.string().min(1, 'Case ID is required'),
    type: z.enum(['CHANGE_IN_FUNCTIONS', 'ENVIRONMENTAL_MODIFICATION', 'JOB_AID', 'LEAVE_OF_ABSENCE', 'PHYSICAL_ACCOMMODATION', 'SCHEDULE_MODIFICATION'] as const),
    subtype: z.string().optional(),
    description: z.string().min(1, 'Description is required'),
    isLongTerm: z.boolean().optional().default(false),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional(),
});

/**
 * GET /api/accommodations
 * List accommodations for a specific case
 */
export async function GET(request: NextRequest) {
    const { session, error } = await requireAuth();

    if (error) return error;

    const tenantPrisma = withTenantScope(prisma, session.tenantId);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');

    if (!caseId) {
        return NextResponse.json({ error: 'Case ID is required' }, { status: 400 });
    }

    try {
        const accommodations = await prisma.accommodation.findMany({
            where: { caseId },
            orderBy: { accommodationNumber: 'asc' },
            include: {
                decisionMaker: {
                    select: { name: true }
                }
            }
        });

        return NextResponse.json(accommodations);
    } catch (error) {
        logger.error({ err: error }, 'Error fetching accommodations');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/accommodations
 * Create a new accommodation request
 */
export async function POST(request: NextRequest) {
    const { session, error } = await requireAuth();

    if (error) return error;

    const tenantPrisma = withTenantScope(prisma, session.tenantId);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const validation = CreateAccommodationSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Validation Error', details: validation.error.issues },
                { status: 400 }
            );
        }
        const { caseId, type, subtype, description, isLongTerm, startDate, endDate } = validation.data;

        // Generate next accommodation number (001, 002, etc.)
        const count = await prisma.accommodation.count({
            where: { caseId }
        });
        const accommodationNumber = (count + 1).toString().padStart(3, '0');

        const accommodation = await prisma.accommodation.create({
            data: {
                caseId,
                accommodationNumber,
                type,
                subtype,
                description,
                isLongTerm,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                status: AccommodationStatus.PENDING,
                lifecycleStatus: LifecycleStatus.OPEN,
                lifecycleSubstatus: LifecycleSubstatus.PENDING,
            }
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                entityType: 'Accommodation',
                entityId: accommodation.id,
                action: 'CREATE',
                metadata: JSON.stringify({
                    accommodationNumber,
                    type
                }),
                userId: session.id,
            }
        });

        return NextResponse.json(accommodation, { status: 201 });

    } catch (error) {
        logger.error({ err: error }, 'Error creating accommodation');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
