import { NextResponse } from "next/server";
import { logoutUser, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
    const session = await getSession();

    if (session) {
        await prisma.auditLog.create({
            data: {
                entityType: 'User',
                entityId: session.id,
                action: 'LOGOUT',
                userId: session.id,
                metadata: JSON.stringify({ action: 'user_logout' })
            }
        });
    }

    await logoutUser();
    return NextResponse.json({ success: true });
}
