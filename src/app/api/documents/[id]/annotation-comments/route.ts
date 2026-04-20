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

        type CommentRow = {
            id: string; parentId: string | null; deletedAt: Date | null; content: string;
            createdAt: Date; updatedAt: Date; createdBy: { id: string; name: string };
        };
        const comments = await tenantPrisma.annotationComment.findMany({
            where: { documentId },
            include: { createdBy: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'asc' },
        }) as CommentRow[];

        const roots = comments.filter(c => !c.parentId);
        // One level of threading only — replies-to-replies are not supported and will not appear.
        const replies = comments.filter(c => c.parentId);

        function formatComment<T extends { deletedAt: Date | null; content: string; [key: string]: unknown }>(c: T) {
            const { deletedAt, ...rest } = c;
            return { ...rest, content: deletedAt ? '[deleted]' : c.content, deleted: !!deletedAt };
        }

        const tree = roots.map(root => ({
            ...formatComment(root),
            replies: replies.filter(r => r.parentId === root.id).map(formatComment),
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

        const VALID_TYPES = ['HIGHLIGHT_PDF', 'HIGHLIGHT_EMAIL', 'DOCUMENT_NOTE', 'EMAIL_NOTE'] as const;
        if (!VALID_TYPES.includes(type)) {
            return NextResponse.json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
        }

        const isNote = type === 'DOCUMENT_NOTE' || type === 'EMAIL_NOTE';
        if (isNote && (!content || !String(content).trim())) {
            return NextResponse.json({ error: 'content is required for note types' }, { status: 400 });
        }

        if (body.parentId) {
            return NextResponse.json({ error: 'Use the /replies endpoint to add a threaded reply' }, { status: 400 });
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
