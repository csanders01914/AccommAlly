import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch all active cases to calculate metrics
        const cases = await prisma.case.findMany({
            where: { status: { not: 'CLOSED' } },
            select: {
                id: true,
                status: true,
                program: true,
                createdAt: true,
                updatedAt: true
            }
        });

        // 2. Calculate Urgency Heatmap (Days since last update vs Status)
        const now = new Date();
        const urgencyStats = {
            '0-3 Days': { count: 0, cases: [] as string[] },
            '4-7 Days': { count: 0, cases: [] as string[] },
            '8-14 Days': { count: 0, cases: [] as string[] },
            '15+ Days': { count: 0, cases: [] as string[] }
        };

        cases.forEach((c: any) => {
            const daysSinceUpdate = Math.floor((now.getTime() - new Date(c.updatedAt).getTime()) / (1000 * 3600 * 24));

            if (daysSinceUpdate <= 3) urgencyStats['0-3 Days'].count++;
            else if (daysSinceUpdate <= 7) urgencyStats['4-7 Days'].count++;
            else if (daysSinceUpdate <= 14) urgencyStats['8-14 Days'].count++;
            else urgencyStats['15+ Days'].count++;
        });

        // 3. Calculate Program Distribution
        const programStats: Record<string, number> = {};
        cases.forEach((c: any) => {
            const prog = c.program || 'Unassigned';
            programStats[prog] = (programStats[prog] || 0) + 1;
        });

        const programDistribution = Object.entries(programStats).map(([name, value]) => ({
            name,
            value
        }));

        return NextResponse.json({
            urgencyStats: Object.entries(urgencyStats).map(([range, data]) => ({
                range,
                count: data.count
            })),
            programDistribution
        });

    } catch (error) {
        console.error('Admin Intelligence Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
