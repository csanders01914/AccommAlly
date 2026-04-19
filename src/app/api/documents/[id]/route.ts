import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

/**
 * DELETE /api/documents/[id] - Permanently delete a document and its annotations
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { session, error } = await requireAuth();
        if (error) return error;

        const { id } = await params;
        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const document = await tenantPrisma.document.findUnique({ where: { id } });
        if (!document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Annotations are deleted automatically via onDelete: Cascade in schema
        await tenantPrisma.document.delete({ where: { id } });

        return new NextResponse(null, { status: 204 });

    } catch (error) {
        logger.error({ err: error }, 'Error deleting document:');
        return NextResponse.json(
            { error: 'Failed to delete document' },
            { status: 500 }
        );
    }
}
