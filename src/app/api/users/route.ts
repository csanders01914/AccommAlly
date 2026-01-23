import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Return simplified list for dropdowns
        const users = await prisma.user.findMany({
            where: { active: true },
            select: {
                id: true,
                name: true,
                role: true,
                email: true, // Useful for showing contact info if needed
            },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error('Users Fetch Error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
