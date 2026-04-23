import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { getPortalSession } from '@/lib/portal-auth';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
 try {
 const session = await getPortalSession();
 if (!session) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 // Filter by both caseId AND tenantId to prevent cross-tenant access
 const caseData = await prisma.case.findFirst({
 where: { id: session.caseId, tenantId: session.tenantId },
 select: {
 caseNumber: true,
 status: true,
 clientName: true,
 createdAt: true,
 updatedAt: true,
 description: true,
 createdById: true,
 createdBy: {
 select: { name: true }
 },
 documents: {
 select: { id: true, fileName: true, createdAt: true, category: true }
 },
 accommodations: {
 select: { type: true, status: true, description: true }
 },
 tasks: {
 where: { status: { not: 'COMPLETED' } },
 take: 1,
 include: {
 assignedTo: {
 select: { name: true }
 }
 }
 }
 }
 });

 if (!caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

 const activeTask = caseData.tasks[0];
 const rawExaminerName = activeTask?.assignedTo?.name || caseData.createdBy?.name || 'Unassigned';

 const decryptedData = {
 ...caseData,
 clientName: decrypt(caseData.clientName),
 createdBy: {
 name: decrypt(rawExaminerName)
 },
 tasks: undefined
 };

 return NextResponse.json(decryptedData);

 } catch (error) {
 logger.error({ err: error }, 'Portal Data Error:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
