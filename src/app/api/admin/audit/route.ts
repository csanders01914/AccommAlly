import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
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
        console.error('Audit API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
