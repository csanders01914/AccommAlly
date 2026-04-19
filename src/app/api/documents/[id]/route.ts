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
        const { session, error } = await requireAuth({ request });
        if (error) return error;

        const { id } = await params;
        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const document = await tenantPrisma.document.findUnique({ where: { id } });
        if (!document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Audit log before delete so we capture fileName and caseId
        await tenantPrisma.auditLog.create({
            data: {
                entityType: 'Document',
                entityId: id,
                action: 'DELETE',
                userId: session.id,
                metadata: JSON.stringify({ fileName: document.fileName, caseId: document.caseId }),
            },
        });

        // Annotation records are removed automatically via onDelete: Cascade on Annotation.document
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
