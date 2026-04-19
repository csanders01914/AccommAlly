import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
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

        if (document.uploadedById !== session.id && !['ADMIN', 'AUDITOR'].includes(session.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Audit log and delete are atomic — a partial state would corrupt the audit trail
        await tenantPrisma.$transaction(async (tx: Prisma.TransactionClient) => {
            await tx.auditLog.create({
                data: {
                    tenantId: session.tenantId,
                    entityType: 'Document',
                    entityId: id,
                    action: 'DELETE',
                    userId: session.id,
                    metadata: JSON.stringify({ fileName: document.fileName, caseId: document.caseId }),
                },
            });
            // Annotation records are removed automatically via onDelete: Cascade on Annotation.document
            await tx.document.delete({ where: { id } });
        });

        return new NextResponse(null, { status: 204 });

    } catch (error) {
        logger.error({ err: error }, 'Error deleting document:');
        return NextResponse.json(
            { error: 'Failed to delete document' },
            { status: 500 }
        );
    }
}
