import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

type RouteContext = { params: Promise<{ id: string; cid: string }> };

const LOCK_DURATION_MS = 24 * 60 * 60 * 1000;

export async function PATCH(request: NextRequest, { params }: RouteContext) {
    try {
        const { session, error } = await requireAuth({ request });
        if (error) return error;

        const { cid } = await params;
        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const comment = await tenantPrisma.annotationComment.findUnique({ where: { id: cid } });
        if (!comment) {
            return NextResponse.json({ error: 'Annotation comment not found' }, { status: 404 });
        }
        if (comment.deletedAt) {
            return NextResponse.json({ error: 'Annotation has been deleted' }, { status: 410 });
        }
        if (comment.createdById !== session.id && session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const isLocked = Date.now() - comment.createdAt.getTime() > LOCK_DURATION_MS;
        if (isLocked && session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Annotation can no longer be edited after 24 hours' }, { status: 409 });
        }

        const body = await request.json();
        if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
            return NextResponse.json({ error: 'content is required' }, { status: 400 });
        }

        const updated = await tenantPrisma.annotationComment.update({
            where: { id: cid },
            data: { content: body.content },
            include: { createdBy: { select: { id: true, name: true } } },
        });

        await tenantPrisma.auditLog.create({
            data: {
                entityType: 'AnnotationComment',
                entityId: cid,
                action: 'UPDATE',
                field: 'content',
                newValue: body.content,
                userId: session.id,
            },
        });

        return NextResponse.json(updated);
    } catch (err) {
        logger.error({ err }, 'Error updating message annotation comment');
        return NextResponse.json({ error: 'Failed to update annotation comment' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
    try {
        const { session, error } = await requireAuth({ request });
        if (error) return error;

        const { cid } = await params;
        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const comment = await tenantPrisma.annotationComment.findUnique({ where: { id: cid } });
        if (!comment) {
            return NextResponse.json({ error: 'Annotation comment not found' }, { status: 404 });
        }
        if (comment.deletedAt) {
            return NextResponse.json({ error: 'Annotation has already been deleted' }, { status: 410 });
        }
        if (comment.createdById !== session.id && session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const isLocked = Date.now() - comment.createdAt.getTime() > LOCK_DURATION_MS;
        if (isLocked && session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Annotation can no longer be deleted after 24 hours' }, { status: 409 });
        }

        await tenantPrisma.annotationComment.update({
            where: { id: cid },
            data: { deletedAt: new Date(), content: '[deleted]' },
        });

        await tenantPrisma.auditLog.create({
            data: {
                entityType: 'AnnotationComment',
                entityId: cid,
                action: 'DELETE',
                userId: session.id,
            },
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        logger.error({ err }, 'Error deleting message annotation comment');
        return NextResponse.json({ error: 'Failed to delete annotation comment' }, { status: 500 });
    }
}
