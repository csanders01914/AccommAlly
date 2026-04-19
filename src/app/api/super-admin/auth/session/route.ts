import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSuperAdminSession } from '@/lib/super-admin-auth';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

/**
 * Get Super-Admin session info
 */
export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('super_admin_token')?.value;

        const session = await getSuperAdminSession(token);

        if (!session) {
            return NextResponse.json(
                { authenticated: false },
                { status: 401 }
            );
        }

        // Verify super admin still exists and is active
        const superAdmin = await prisma.superAdmin.findUnique({
            where: { id: session.id },
            select: { id: true, name: true, email: true, active: true },
        });

        if (!superAdmin || !superAdmin.active) {
            return NextResponse.json(
                { authenticated: false },
                { status: 401 }
            );
        }

        return NextResponse.json({
            authenticated: true,
            superAdmin: {
                id: superAdmin.id,
                name: superAdmin.name,
                email: superAdmin.email,
            },
        });
    } catch (error) {
        logger.error({ err: error }, 'Super-Admin session error:');
        return NextResponse.json(
            { authenticated: false },
            { status: 500 }
        );
    }
}
