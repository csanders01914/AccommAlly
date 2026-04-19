import { SUPER_ADMIN_SESSION_COOKIE_NAME } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSuperAdminSession } from '@/lib/super-admin-auth';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

async function requireSuperAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE_NAME)?.value;
    const session = await getSuperAdminSession(token);

    if (!session) {
        return null;
    }

    const superAdmin = await prisma.superAdmin.findUnique({
        where: { id: session.id },
        select: { id: true, active: true },
    });

    return superAdmin?.active ? session : null;
}

export async function GET(request: NextRequest) {
    try {
        const session = await requireSuperAdmin();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const plans = await prisma.subscriptionPlan.findMany({
            orderBy: { maxUsers: 'asc' }
        });

        // Ensure "Unlimited" (-1) shows up last naturally or handle in UI.
        // Usually -1 is "less" than 5, so explicit sorting might be better if desired.
        // For now, simple sort or code sort.

        return NextResponse.json(plans);
    } catch (error) {
        logger.error({ err: error }, 'List plans error:');
        return NextResponse.json({ error: 'Failed to list plans' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await requireSuperAdmin();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, maxUsers, maxActiveClaims } = body;

        if (!id) {
            return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });
        }

        const updatedPlan = await prisma.subscriptionPlan.update({
            where: { id },
            data: {
                maxUsers: Number(maxUsers),
                maxActiveClaims: Number(maxActiveClaims)
            }
        });

        return NextResponse.json(updatedPlan);

    } catch (error) {
        logger.error({ err: error }, 'Update plan error:');
        return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
    }
}
