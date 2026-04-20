import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

type RouteContext = { params: Promise<{ id: string; cid: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const { session, error } = await requireAuth({ request });
        if (error) return error;

        const { cid } = await params;
        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const parent = await tenantPrisma.annotationComment.findUnique({ where: { id: cid } });
        if (!parent) {
            return NextResponse.json({ error: 'Parent annotation comment not found' }, { status: 404 });
        }
        if (parent.parentId) {
            return NextResponse.json({ error: 'Cannot reply to a reply — only one level of threading allowed' }, { status: 400 });
        }
        if (parent.deletedAt) {
            return NextResponse.json({ error: 'Cannot reply to a deleted annotation' }, { status: 410 });
        }

        const body = await request.json();
        if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
            return NextResponse.json({ error: 'content is required' }, { status: 400 });
        }

        const reply = await tenantPrisma.annotationComment.create({
            data: {
                documentId: parent.documentId,
                messageId: parent.messageId,
                parentId: cid,
                type: parent.type,
                content: body.content,
                createdById: session.id,
            },
            include: { createdBy: { select: { id: true, name: true } } },
        });

        await tenantPrisma.auditLog.create({
            data: {
                entityType: 'AnnotationComment',
                entityId: reply.id,
                action: 'CREATE',
                userId: session.id,
            },
        });

        return NextResponse.json(reply, { status: 201 });
    } catch (err) {
        logger.error({ err }, 'Error creating message annotation comment reply');
        return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
    }
}
