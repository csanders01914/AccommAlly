import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPortalSession } from '@/lib/portal-auth';
import { decrypt } from '@/lib/encryption';
import logger from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { caseId } = await params;

    const caseData = await prisma.case.findFirst({
      where: {
        id: caseId,
        claimantRef: session.claimantId,
        tenantId: session.tenantId,
      },
      select: {
        caseNumber: true,
        title: true,
        status: true,
        clientName: true,
        description: true,
        medicalCondition: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { name: true } },
        documents: {
          select: { id: true, fileName: true, createdAt: true, category: true },
          orderBy: { createdAt: 'desc' },
        },
        accommodations: {
          select: { type: true, status: true, description: true },
        },
        tasks: {
          where: { status: { not: 'COMPLETED' } },
          take: 1,
          select: { assignedTo: { select: { name: true } } },
        },
      },
    });

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const examinerName =
      caseData.tasks[0]?.assignedTo?.name || caseData.createdBy?.name;

    return NextResponse.json({
      caseNumber: caseData.caseNumber,
      title: caseData.title,
      status: caseData.status,
      clientName: decrypt(caseData.clientName),
      description: caseData.description,
      medicalCondition: caseData.medicalCondition,
      createdAt: caseData.createdAt,
      updatedAt: caseData.updatedAt,
      examiner: examinerName ? decrypt(examinerName) : null,
      documents: caseData.documents,
      accommodations: caseData.accommodations,
    });
  } catch (error) {
    logger.error({ err: error }, 'Portal Claim Status Error:');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
