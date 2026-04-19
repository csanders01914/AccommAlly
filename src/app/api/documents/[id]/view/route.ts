import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
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

/**
 * GET /api/documents/[id]/view - View a document inline in browser
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { session, error } = await requireAuth();
        if (error) return error;

        const { id } = await params;
        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        // Fetch document including binary data — tenantPrisma enforces tenant isolation
        const document = await tenantPrisma.document.findUnique({
            where: { id },
            select: {
                id: true,
                fileName: true,
                fileType: true,
                fileData: true,
            },
        });

        if (!document) {
            return NextResponse.json(
                { error: 'Document not found' },
                { status: 404 }
            );
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

        return response;

    } catch (error) {
        logger.error({ err: error }, 'Error viewing document:');
        return NextResponse.json(
            { error: 'Failed to view document' },
            { status: 500 }
        );
    }
}
