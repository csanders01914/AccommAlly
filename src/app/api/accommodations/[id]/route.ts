
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { AccommodationStatus, LifecycleStatus, LifecycleSubstatus } from '@prisma/client';

/**
 * PATCH /api/accommodations/[id]
 * Update accommodation details, status, or close/reopen
 */
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const {
            status,
            lifecycleStatus,
            lifecycleSubstatus,
            decisionDate,
            isLongTerm,
            endDate
        } = body;

        // Prepare update data
        const updateData: any = {};

        if (status) updateData.status = status;
        if (lifecycleStatus) updateData.lifecycleStatus = lifecycleStatus;
        if (lifecycleSubstatus) updateData.lifecycleSubstatus = lifecycleSubstatus;
        if (decisionDate) updateData.decisionDate = new Date(decisionDate);
        if (typeof isLongTerm === 'boolean') updateData.isLongTerm = isLongTerm;
        if (endDate) updateData.endDate = new Date(endDate);

        // If status is being changed to APPROVED or REJECTED, record the decision maker
        if (status === 'APPROVED' || status === 'REJECTED') {
            updateData.decisionMakerId = session.id;
            if (!decisionDate) {
                updateData.decisionDate = new Date();
            }
        }

        const accommodation = await prisma.accommodation.update({
            where: { id: params.id },
            data: updateData
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                entityType: 'Accommodation',
                entityId: accommodation.id,
                action: 'UPDATE',
                metadata: JSON.stringify({
                    changes: Object.keys(updateData)
                }),
                userId: session.id,
            }
        });

        return NextResponse.json(accommodation);

    } catch (error) {
        console.error('Error updating accommodation:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
