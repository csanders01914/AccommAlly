import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPortalSession } from '@/lib/portal-auth';
import logger from '@/lib/logger';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/tiff',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
]);

function generateDCN(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
    String(now.getMilliseconds()).padStart(3, '0'),
  ].join('');
}

async function resolveCase(
  session: { claimantId: string; tenantId: string },
  caseId: string
) {
  return prisma.case.findFirst({
    where: { id: caseId, claimantRef: session.claimantId, tenantId: session.tenantId },
    select: { id: true },
  });
}

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
    const caseData = await resolveCase(session, caseId);
    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const documents = await prisma.document.findMany({
      where: { caseId: caseData.id, tenantId: session.tenantId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, fileName: true, fileType: true, fileSize: true, category: true, createdAt: true },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    logger.error({ err: error }, 'Portal Claim Documents GET Error:');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { caseId } = await params;
    const caseData = await resolveCase(session, caseId);
    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || 'OTHER';

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds the 10 MB size limit' }, { status: 400 });
    }

    if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    const validCategories = ['MEDICAL', 'LEGAL', 'HR', 'CORRESPONDENCE', 'OTHER'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const documentControlNumber = generateDCN();
    const buffer = Buffer.from(await file.arrayBuffer());

    const document = await prisma.document.create({
      data: {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileData: buffer,
        documentControlNumber,
        category,
        caseId: caseData.id,
        tenantId: session.tenantId,
        // uploadedById is null for portal uploads (field is now optional)
      },
      select: { id: true, fileName: true, category: true, createdAt: true },
    });

    return NextResponse.json({ success: true, document });
  } catch (error) {
    logger.error({ err: error }, 'Portal Claim Documents POST Error:');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
