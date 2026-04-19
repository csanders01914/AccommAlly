import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const { type, request: requestText, startDate, endDate, costCode } = body;

        // Verify case exists
        const caseExists = await prisma.case.findUnique({
            where: { id },
        });

        if (!caseExists) {
            return NextResponse.json(
                { error: 'Case not found' },
                { status: 404 }
            );
        }

        const accommodation = await prisma.accommodation.create({
            data: {
                type,
                request: requestText,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                costCode,
                status: 'PENDING',
                caseId: id,
            },
        });

        return NextResponse.json(accommodation);

    } catch (error) {
        logger.error({ err: error }, 'Error creating accommodation:');
        return NextResponse.json(
            { error: 'Failed to create accommodation' },
            { status: 500 }
        );
    }
}
