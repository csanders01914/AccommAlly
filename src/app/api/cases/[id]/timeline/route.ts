import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

export async function GET(
 request: NextRequest,
 context: { params: Promise<{ id: string }> }
) {
 try {
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);
 if (!session) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 const params = await context.params;
 const caseId = params.id;

 // 1. Fetch the Case to verify existence and get related IDs
 const caseData = await prisma.case.findUnique({
 where: { id: caseId },
 include: {
 tasks: { select: { id: true } },
 notes: { select: { id: true } },
 accommodations: { select: { id: true } },
 documents: { select: { id: true } },
 }
 });

 if (!caseData) {
 return NextResponse.json({ error: 'Case not found' }, { status: 404 });
 }

 // 2. Collect all Entity IDs
 const entityIds = [
 caseId,
 ...caseData.tasks.map((t: { id: string }) => t.id),
 ...caseData.notes.map((n: { id: string }) => n.id),
 ...caseData.accommodations.map((a: { id: string }) => a.id),
 ...caseData.documents.map((d: { id: string }) => d.id)
 ];

 // 3. Fetch Audit Logs for ANY of these entities
 const timelineLogs = await prisma.auditLog.findMany({
 where: {
 entityId: { in: entityIds }
 },
 include: {
 user: {
 select: { id: true, name: true, role: true }
 }
 },
 orderBy: {
 timestamp: 'desc'
 }
 });

 // 4. Transform for Frontend
 // We can add "Context" to the log based on entity type
 const timeline = timelineLogs.map((log: any) => ({
 id: log.id,
 timestamp: log.timestamp,
 user: log.user,
 action: log.action,
 entityType: log.entityType,
 details: (() => {
 if (log.action === 'REVEAL_SSN') return 'Revealed SSN';
 if (log.metadata && !log.metadata.startsWith('{')) return log.metadata;
 if (log.field) return `Changed ${log.field} to ${log.newValue}`;
 return '';
 })(),
 raw: {
 oldValue: log.oldValue,
 newValue: log.newValue,
 field: log.field
 }
 }));

 return NextResponse.json({ timeline });

 } catch (error) {
 logger.error({ err: error }, 'Timeline API Error:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
