import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSuperAdminSession } from '@/lib/super-admin-auth';
import { cookies } from 'next/headers';

async function requireSuperAdmin() {
    const cookieStore = await cookies();
    const token = cookieStore.get('super_admin_token')?.value;
    const session = await getSuperAdminSession(token);
    if (!session) return null;
    const superAdmin = await prisma.superAdmin.findUnique({
        where: { id: session.id },
        select: { id: true, active: true },
    });
    return superAdmin?.active ? session : null;
}

/**
 * GET /api/super-admin/settings?tenantId=xxx
 * Fetch a tenant's settings as super admin
 */
export async function GET(request: NextRequest) {
    const session = await requireSuperAdmin();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = request.nextUrl.searchParams.get('tenantId');
    if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });

    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, settings: true },
    });

    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    return NextResponse.json({ tenant });
}

/**
 * PATCH /api/super-admin/settings?tenantId=xxx
 * Update a tenant's settings as super admin
 */
export async function PATCH(request: NextRequest) {
    const session = await requireSuperAdmin();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = request.nextUrl.searchParams.get('tenantId');
    if (!tenantId) return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });

    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, settings: true },
    });

    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const { settings } = await request.json();

    const currentSettings = (tenant.settings as Record<string, any>) || {};
    const updatedSettings = {
        ...currentSettings,
        ...settings,
        branding: {
            ...(currentSettings.branding || {}),
            ...(settings.branding || {}),
        },
    };

    const updated = await prisma.tenant.update({
        where: { id: tenantId },
        data: { settings: updatedSettings },
        select: { settings: true },
    });

    return NextResponse.json({ settings: updated.settings });
}
