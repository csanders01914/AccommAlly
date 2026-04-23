import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);
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
 logger.error({ err: e }, 'Database health check failed:');
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
