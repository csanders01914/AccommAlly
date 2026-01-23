import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [
            totalCases,
            activeCases,
            totalUsers,
            totalDocuments,
            recentLogs
        ] = await Promise.all([
            prisma.case.count(),
            prisma.case.count({ where: { status: { not: 'CLOSED' } } }),
            prisma.user.count(),
            prisma.document.count(),
            prisma.auditLog.findMany({
                take: 5,
                orderBy: { timestamp: 'desc' },
                include: { user: { select: { name: true } } }
            })
        ]);

        return NextResponse.json({
            stats: {
                totalCases,
                activeCases,
                totalUsers,
                totalDocuments
            },
            recentLogs
        });
    } catch (error) {
        console.error('Admin Stats Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
