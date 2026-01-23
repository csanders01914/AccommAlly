import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const start = performance.now();
    let dbStatus = 'disconnected';
    let dbLatency = 0;

    try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
        dbLatency = Math.round(performance.now() - start);
    } catch (e) {
        console.error('Database health check failed:', e);
        dbStatus = 'error';
    }

    // Check system memory usage
    const memory = process.memoryUsage();

    return NextResponse.json({
        status: dbStatus === 'connected' ? 'healthy' : 'degraded',
        database: {
            status: dbStatus,
            latency: `${dbLatency}ms`
        },
        system: {
            uptime: process.uptime(),
            memory: {
                rss: Math.round(memory.rss / 1024 / 1024) + 'MB',
                heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + 'MB',
                heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB',
            },
            nodeVersion: process.version
        },
        timestamp: new Date().toISOString()
    });
}
