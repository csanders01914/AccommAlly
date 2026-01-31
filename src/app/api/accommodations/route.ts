
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { LifecycleStatus, LifecycleSubstatus, AccommodationStatus } from '@prisma/client';

/**
 * GET /api/accommodations
 * List accommodations for a specific case
 */
export async function GET(request: NextRequest) {
    const session = await getSession();
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
        console.error('Error fetching accommodations:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/accommodations
 * Create a new accommodation request
 */
export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const {
            caseId,
            type,
            subtype,
            description,
            isLongTerm,
            startDate,
            endDate
        } = body;

        if (!caseId || !type || !description || !startDate) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

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
        console.error('Error creating accommodation:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
