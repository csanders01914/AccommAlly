import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/documents/[id]/view - View a document inline in browser
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Fetch document including binary data
        const document = await prisma.document.findUnique({
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

        // Create response with file data
        const response = new NextResponse(document.fileData);

        // Set headers for inline viewing (not download)
        response.headers.set('Content-Type', document.fileType);
        response.headers.set(
            'Content-Disposition',
            `inline; filename="${encodeURIComponent(document.fileName)}"`
        );
        response.headers.set('Content-Length', document.fileData.length.toString());

        return response;

    } catch (error) {
        console.error('Error viewing document:', error);
        return NextResponse.json(
            { error: 'Failed to view document' },
            { status: 500 }
        );
    }
}
