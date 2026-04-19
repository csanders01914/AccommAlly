import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import { prisma } from "@/lib/prisma";
import logger from '@/lib/logger';

export async function GET() {
    const { session, error } = await requireAuth();

    if (error) return error;

    const tenantPrisma = withTenantScope(prisma, session.tenantId);

    // 1. Verify Authentication
    if (!session || !session.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch User with Tenant
    const user = await prisma.user.findUnique({
        where: { id: (session as any).id },
        include: { tenant: true }
    });

    if (!user || !user.tenant) {
        return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // 3. Verify Admin Role
    if (user.role !== 'ADMIN') {
        return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    return NextResponse.json({ settings: user.tenant.settings });
}

export async function PATCH(request: NextRequest) {
    const { session, error } = await requireAuth();

    if (error) return error;

    const tenantPrisma = withTenantScope(prisma, session.tenantId);

    // 1. Verify Authentication
    if (!session || !session.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch User with Tenant
    const user = await prisma.user.findUnique({
        where: { id: (session as any).id },
        include: { tenant: true }
    });

    if (!user || !user.tenant) {
        return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // 3. Verify Admin Role
    if (user.role !== 'ADMIN') {
        return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // 4. Update Settings
    try {
        const body = await request.json();
        const { settings } = body;

        // Merge existing settings with new settings
        const currentSettings = (user.tenant.settings as Record<string, any>) || {};
        const updatedSettings = {
            ...currentSettings,
            ...settings,
            // Ensure branding is carefully merged if sent partially
            branding: {
                ...(currentSettings.branding || {}),
                ...(settings.branding || {})
            }
        };

        const updatedTenant = await prisma.tenant.update({
            where: { id: user.tenant.id },
            data: { settings: updatedSettings },
            select: { settings: true }
        });

        return NextResponse.json({ settings: updatedTenant.settings });
    } catch (e) {
        logger.error({ err: e }, "Error updating tenant settings");
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
