import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPortalSession } from '@/lib/portal-auth';
import { decrypt, encrypt } from '@/lib/encryption';
import crypto from 'crypto';
import logger from '@/lib/logger';

function generateCaseNumber(): string {
  const year = new Date().getFullYear();
  const random = crypto.randomInt(10000, 99999);
  return `AA-${year}-${random}`;
}

const VALID_ACCOMMODATION_TYPES = [
  'CHANGE_IN_FUNCTIONS',
  'ENVIRONMENTAL_MODIFICATION',
  'JOB_AID',
  'LEAVE_OF_ABSENCE',
  'PHYSICAL_ACCOMMODATION',
  'SCHEDULE_MODIFICATION',
] as const;

type AccomType = (typeof VALID_ACCOMMODATION_TYPES)[number];

export async function GET(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cases = await prisma.case.findMany({
      where: { claimantRef: session.claimantId, tenantId: session.tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        caseNumber: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { name: true } },
      },
    });

    const claims = cases.map((c: (typeof cases)[number]) => ({
      id: c.id,
      caseNumber: c.caseNumber,
      title: c.title,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      examiner: c.createdBy?.name ? decrypt(c.createdBy.name) : null,
    }));

    return NextResponse.json({ claims });
  } catch (error) {
    logger.error({ err: error }, 'Portal Claims List Error:');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      functionalNeed,
      preferredStartDate,
      accommodationTypes,
    } = body as {
      title: string;
      description?: string;
      functionalNeed?: string;
      preferredStartDate?: string;
      accommodationTypes?: { type: string; description: string }[];
    };

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'A title for your request is required' }, { status: 400 });
    }
    if (title.trim().length > 200) {
      return NextResponse.json({ error: 'Title is too long (max 200 characters)' }, { status: 400 });
    }
    if (description && description.length > 5000) {
      return NextResponse.json({ error: 'Description is too long (max 5000 characters)' }, { status: 400 });
    }
    if (!accommodationTypes || accommodationTypes.length === 0) {
      return NextResponse.json({ error: 'Please select at least one accommodation type' }, { status: 400 });
    }

    const validatedTypes = accommodationTypes.filter((a) =>
      (VALID_ACCOMMODATION_TYPES as readonly string[]).includes(a.type)
    ) as { type: AccomType; description: string }[];

    if (validatedTypes.length === 0) {
      return NextResponse.json({ error: 'No valid accommodation types provided' }, { status: 400 });
    }

    const claimant = await prisma.claimant.findFirst({
      where: { id: session.claimantId, tenantId: session.tenantId },
      select: { name: true },
    });
    if (!claimant) {
      return NextResponse.json({ error: 'Claimant not found' }, { status: 404 });
    }

    const assignee = await prisma.user.findFirst({
      where: { tenantId: session.tenantId, active: true, role: { in: ['ADMIN', 'COORDINATOR'] } },
      select: { id: true },
    });
    if (!assignee) {
      return NextResponse.json(
        { error: 'No coordinators are available. Please contact your organization directly.' },
        { status: 503 }
      );
    }

    let caseNumber = generateCaseNumber();
    for (let i = 0; i < 5; i++) {
      const existing = await prisma.case.findUnique({ where: { caseNumber } });
      if (!existing) break;
      caseNumber = generateCaseNumber();
    }

    const decryptedName = decrypt(claimant.name);
    const lastName = decryptedName.trim().split(/\s+/).pop() ?? '';
    const startDate = preferredStartDate ? new Date(preferredStartDate) : new Date();

    const newCase = await prisma.case.create({
      data: {
        tenantId: session.tenantId,
        caseNumber,
        clientName: claimant.name,
        clientLastName: encrypt(lastName),
        title: title.trim(),
        description: description?.trim() || null,
        medicalCondition: functionalNeed?.trim() || null,
        preferredStartDate: preferredStartDate || null,
        claimantRef: session.claimantId,
        createdById: assignee.id,
      },
      select: { id: true, caseNumber: true },
    });

    // Create an Accommodation record for each selected type
    for (let i = 0; i < validatedTypes.length; i++) {
      const { type, description: accDesc } = validatedTypes[i];
      const accommodationNumber = String(i + 1).padStart(3, '0');
      await prisma.accommodation.create({
        data: {
          tenantId: session.tenantId,
          caseId: newCase.id,
          accommodationNumber,
          type,
          description: accDesc || type,
          startDate,
          status: 'PENDING',
          lifecycleStatus: 'OPEN',
          lifecycleSubstatus: 'PENDING',
        },
      });
    }

    // Summarize selected types for the coordinator note
    const typeList = validatedTypes.map((a) => a.type.replace(/_/g, ' ')).join(', ');

    await prisma.note.create({
      data: {
        content: [
          `Claim submitted via claimant self-service portal.`,
          ``,
          `Accommodation types requested: ${typeList}`,
          functionalNeed?.trim() ? `\nPurpose: ${functionalNeed.trim()}` : '',
          preferredStartDate ? `\nRequested start date: ${startDate.toLocaleDateString()}` : '',
        ].join('\n').trim(),
        noteType: 'PORTAL_SUBMISSION',
        caseId: newCase.id,
        authorId: assignee.id,
        tenantId: session.tenantId,
      },
    }).catch(() => {});

    await prisma.task.create({
      data: {
        title: 'Review Portal Submission',
        description: `New accommodation request submitted by claimant via portal.\n\nCase: ${caseNumber}\nTitle: ${title.trim()}\nTypes: ${typeList}`,
        status: 'PENDING',
        priority: 'HIGH',
        category: 'OTHER',
        dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
        caseId: newCase.id,
        assignedToId: assignee.id,
        createdById: assignee.id,
        tenantId: session.tenantId,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, claim: newCase });
  } catch (error) {
    logger.error({ err: error }, 'Portal Create Claim Error:');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
