import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { session, error } = await requireAuth();

        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);
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
        logger.error({ err: error }, 'Unread Count Error:');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
