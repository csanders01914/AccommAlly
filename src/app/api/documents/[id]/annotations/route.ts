import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/documents/[id]/annotations - Get all annotations for a document
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: documentId } = await params;

        const annotations = await prisma.annotation.findMany({
            where: { documentId },
            include: {
                createdBy: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json(annotations);

    } catch (error) {
        logger.error({ err: error }, 'Error fetching annotations:');
        return NextResponse.json(
            { error: 'Failed to fetch annotations' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/documents/[id]/annotations - Create a new annotation
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: documentId } = await params;
        const body = await request.json();

        const { pageNumber, color, x, y, width, height, userId } = body;

        // Validate required fields
        if (pageNumber === undefined || x === undefined || y === undefined ||
            width === undefined || height === undefined || !userId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Verify document exists
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            select: { id: true },
        });

        if (!document) {
            return NextResponse.json(
                { error: 'Document not found' },
                { status: 404 }
            );
        }

        // Create annotation
        const annotation = await prisma.annotation.create({
            data: {
                documentId,
                pageNumber,
                color: color || '#FFFF00',
                x,
                y,
                width,
                height,
                createdById: userId,
            },
            include: {
                createdBy: {
                    select: { id: true, name: true },
                },
            },
        });

        return NextResponse.json(annotation, { status: 201 });

    } catch (error) {
        logger.error({ err: error }, 'Error creating annotation:');
        return NextResponse.json(
            { error: 'Failed to create annotation' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/documents/[id]/annotations - Update an annotation
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const body = await request.json();
        const { annotationId, x, y, width, height } = body;

        if (!annotationId) {
            return NextResponse.json(
                { error: 'Annotation ID required' },
                { status: 400 }
            );
        }

        // Update annotation
        const updatedAnnotation = await prisma.annotation.update({
            where: { id: annotationId },
            data: {
                x,
                y,
                width,
                height,
            },
        });

        return NextResponse.json(updatedAnnotation);

    } catch (error) {
        logger.error({ err: error }, 'Error updating annotation:');
        return NextResponse.json(
            { error: 'Failed to update annotation' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/documents/[id]/annotations - Delete an annotation
 * Query param: annotationId
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { searchParams } = new URL(request.url);
        const annotationId = searchParams.get('annotationId');

        if (!annotationId) {
            return NextResponse.json(
                { error: 'Annotation ID required' },
                { status: 400 }
            );
        }

        await prisma.annotation.delete({
            where: { id: annotationId },
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        logger.error({ err: error }, 'Error deleting annotation:');
        return NextResponse.json(
            { error: 'Failed to delete annotation' },
            { status: 500 }
        );
    }
}
