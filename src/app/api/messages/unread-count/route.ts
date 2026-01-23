import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const count = await prisma.message.count({
            where: {
                recipientId: session.id,
                read: false,
                archived: false,
                deletedByRecipient: false,
                inInbox: true
            }
        });

        return NextResponse.json({ count });
    } catch (error) {
        console.error('Unread Count Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
