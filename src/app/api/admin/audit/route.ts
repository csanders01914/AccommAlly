import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import { decrypt } from '@/lib/encryption';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
    try {
        const { session, error } = await requireAuth();

        if (error) return error;

        const tenantPrisma = withTenantScope(prisma, session.tenantId);
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                skip,
                take: limit,
                orderBy: { timestamp: 'desc' },
                include: { user: true }
            }),
            prisma.auditLog.count()
        ]);

        // Manually decrypt nested user data (Extension doesn't always catch deep includes)
        const decryptedLogs = logs.map((log: any) => {
            // 1. Decrypt User fields if present
            if (log.user) {
                if (log.user.name) log.user.name = decrypt(log.user.name);
                if (log.user.email) log.user.email = decrypt(log.user.email);
            }
            return log;
        });

        return NextResponse.json({
            logs: decryptedLogs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error({ err: error }, 'Audit API Error:');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
