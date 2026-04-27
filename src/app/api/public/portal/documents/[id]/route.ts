import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPortalSession } from '@/lib/portal-auth';
import logger from '@/lib/logger';

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

function sanitizeContentType(fileType: string): string {
  return ALLOWED_CONTENT_TYPES.has(fileType) ? fileType : 'application/octet-stream';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify the document belongs to one of this claimant's cases within their tenant
    const document = await prisma.document.findFirst({
      where: {
        id,
        tenantId: session.tenantId,
        case: {
          claimantRef: session.claimantId,
          tenantId: session.tenantId,
        },
      },
      select: {
        fileName: true,
        fileType: true,
        fileData: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const response = new NextResponse(document.fileData);
    response.headers.set('Content-Type', sanitizeContentType(document.fileType));
    response.headers.set(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(document.fileName)}"`
    );
    response.headers.set('Content-Length', document.fileData.length.toString());
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Cache-Control', 'no-store, private');
    response.headers.set('Content-Security-Policy', "default-src 'none'");

    return response;
  } catch (error) {
    logger.error({ err: error }, 'Portal Document Download Error:');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
