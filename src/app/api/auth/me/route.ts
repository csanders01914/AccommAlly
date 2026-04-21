import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ user: null });
    }

    // Fetch fresh user data with tenant settings
    const user = await prisma.user.findUnique({
        where: { id: session.id },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            username: true,
            pronouns: true,
            theme: true,
            notifications: true,
            tenant: {
                select: {
                    id: true,
                    name: true,
                    settings: true,
                    plan: true
                }
            }
        }
    });

    return NextResponse.json({ user: user || session });
}
