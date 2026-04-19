import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSuperAdminSession } from '@/lib/super-admin-auth';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

/**
 * Verify Super-Admin session helper
 */
async function requireSuperAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get('super_admin_token')?.value;
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

/**
 * GET /api/super-admin/tenants/[id] - Get tenant details
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await requireSuperAdmin();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const tenant = await prisma.tenant.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        users: true,
                        cases: true,
                        clients: true,
                        documents: true,
                    },
                },
            },
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        return NextResponse.json({ tenant });
    } catch (error) {
        logger.error({ err: error }, 'Get tenant error:');
        return NextResponse.json({ error: 'Failed to get tenant' }, { status: 500 });
    }
}

/**
 * PATCH /api/super-admin/tenants/[id] - Update tenant
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await requireSuperAdmin();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { name, domain, plan, status, settings } = body;

        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (domain !== undefined) updateData.domain = domain || null;
        if (plan !== undefined) updateData.plan = plan;
        if (status !== undefined) updateData.status = status;
        if (settings !== undefined) updateData.settings = settings;

        // Check domain uniqueness if changing
        if (domain) {
            const existingDomain = await prisma.tenant.findFirst({
                where: { domain, id: { not: id } },
                select: { id: true },
            });

            if (existingDomain) {
                return NextResponse.json(
                    { error: 'Domain is already in use by another tenant' },
                    { status: 409 }
                );
            }
        }

        // If plan is changing, sync the relation
        if (plan) {
            const subscriptionPlan = await prisma.subscriptionPlan.findUnique({
                where: { code: plan }
            });
            if (subscriptionPlan) {
                updateData.planId = subscriptionPlan.id;
            } else {
                // If invalid plan code provided, maybe warn or fail?
                // For now, let's just keep the string update but log it
                logger.warn(`Invalid plan code provided: ${plan}`);
            }
        }

        const tenant = await prisma.tenant.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({ tenant });
    } catch (error) {
        logger.error({ err: error }, 'Update tenant error:');
        return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 });
    }
}

/**
 * DELETE /api/super-admin/tenants/[id] - Soft delete tenant
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await requireSuperAdmin();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Soft delete by changing status
        const tenant = await prisma.tenant.update({
            where: { id },
            data: { status: 'DELETED' },
        });

        return NextResponse.json({
            success: true,
            message: 'Tenant marked as deleted',
            tenant: { id: tenant.id, status: tenant.status },
        });
    } catch (error) {
        logger.error({ err: error }, 'Delete tenant error:');
        return NextResponse.json({ error: 'Failed to delete tenant' }, { status: 500 });
    }
}
