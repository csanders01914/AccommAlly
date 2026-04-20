import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
    try {
        const { session, error } = await requireAuth();
        if (error) return error;

        const { id: documentId } = await params;
        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const comments = await tenantPrisma.annotationComment.findMany({
            where: { documentId },
            include: { createdBy: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'asc' },
        });

        const roots = comments.filter(c => !c.parentId);
        const replies = comments.filter(c => c.parentId);
        const tree = roots.map(root => ({
            ...root,
            content: root.deletedAt ? '[deleted]' : root.content,
            replies: replies
                .filter(r => r.parentId === root.id)
                .map(r => ({ ...r, content: r.deletedAt ? '[deleted]' : r.content })),
        }));

        return NextResponse.json(tree);
    } catch (err) {
        logger.error({ err }, 'Error fetching document annotation comments');
        return NextResponse.json({ error: 'Failed to fetch annotation comments' }, { status: 500 });
    }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const { session, error } = await requireAuth({ request });
        if (error) return error;

        const { id: documentId } = await params;
        const body = await request.json();
        const { type, content, color, pageNumber, x, y, width, height, selectedText, selectionStart, selectionEnd } = body;

        if (!type || content === undefined || content === null) {
            return NextResponse.json({ error: 'type and content are required' }, { status: 400 });
        }

        const tenantPrisma = withTenantScope(prisma, session.tenantId);

        const document = await tenantPrisma.document.findUnique({ where: { id: documentId }, select: { id: true } });
        if (!document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        const comment = await tenantPrisma.annotationComment.create({
            data: {
                documentId,
                type,
                content,
                color: color ?? null,
                pageNumber: pageNumber ?? null,
                x: x ?? null,
                y: y ?? null,
                width: width ?? null,
                height: height ?? null,
                selectedText: selectedText ?? null,
                selectionStart: selectionStart ?? null,
                selectionEnd: selectionEnd ?? null,
                createdById: session.id,
            },
            include: { createdBy: { select: { id: true, name: true } } },
        });

        await tenantPrisma.auditLog.create({
            data: {
                entityType: 'AnnotationComment',
                entityId: comment.id,
                action: 'CREATE',
                userId: session.id,
            },
        });

        return NextResponse.json(comment, { status: 201 });
    } catch (err) {
        logger.error({ err }, 'Error creating document annotation comment');
        return NextResponse.json({ error: 'Failed to create annotation comment' }, { status: 500 });
    }
}
