import { NextResponse } from "next/server";
import { logoutUser, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import logger from '@/lib/logger';

export async function POST() {
    const session = await getSession();

    // Always clear the cookie first — don't let audit logging failures block logout
    await logoutUser();

    if (session) {
        try {
            await prisma.auditLog.create({
                data: {
                    entityType: 'User',
                    entityId: session.id,
                    action: 'LOGOUT',
                    userId: session.id,
                    tenantId: session.tenantId as string,
                    metadata: JSON.stringify({ action: 'user_logout' })
                }
            });
        } catch (e) {
            // Don't fail logout if audit logging fails
            logger.error({ err: e }, 'Audit log error on logout:');
        }
    }

    return NextResponse.json({ success: true });
}
