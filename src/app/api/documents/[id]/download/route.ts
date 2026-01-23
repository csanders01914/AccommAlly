import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/documents/[id]/download - Download a document by ID
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
        let responseData = document.fileData;
        let contentLength = document.fileData.length;

        // Process annotations if requested and file is PDF
        const withAnnotations = request.nextUrl.searchParams.get('annotations') === 'true';

        if (withAnnotations && document.fileType === 'application/pdf') {
            const annotations = await prisma.annotation.findMany({
                where: { documentId: id }
            });

            if (annotations.length > 0) {
                try {
                    const { PDFDocument, rgb } = await import('pdf-lib');
                    const pdfDoc = await PDFDocument.load(document.fileData);
                    const pages = pdfDoc.getPages();

                    for (const annotation of annotations) {
                        const pageIndex = annotation.pageNumber - 1;
                        if (pageIndex >= 0 && pageIndex < pages.length) {
                            const page = pages[pageIndex];
                            const { width, height } = page.getSize();

                            // Parse color or default to yellow
                            let color = rgb(1, 1, 0); // Yellow default
                            let opacity = 0.4;

                            const rgbaMatch = annotation.color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
                            if (rgbaMatch) {
                                const [_, r, g, b, a] = rgbaMatch;
                                color = rgb(parseInt(r) / 255, parseInt(g) / 255, parseInt(b) / 255);
                                opacity = parseFloat(a);
                            }

                            // Convert percentages to points
                            // Note: PDF coordinates start from bottom-left, but web viewer usually top-left.
                            // react-pdf and standard web viewers usually handle TOP-LEFT based coordinates for overlays.
                            // We need to verify if the saved coordinates are top-left based (standard for web).
                            // If they are top-left:
                            // x = x% * width
                            // y = height - (y% * height) - (height% * height) -> because PDF y is from bottom

                            const x = (annotation.x / 100) * width;
                            const w = (annotation.width / 100) * width;
                            const h = (annotation.height / 100) * height;
                            // Transform Y from top-left (web) to bottom-left (PDF)
                            const y = height - ((annotation.y / 100) * height) - h;

                            page.drawRectangle({
                                x,
                                y,
                                width: w,
                                height: h,
                                color,
                                opacity,
                            });
                        }
                    }

                    const modifiedPdfBytes = await pdfDoc.save();
                    responseData = Buffer.from(modifiedPdfBytes);
                    contentLength = responseData.length;
                } catch (e) {
                    console.error('Error flattening PDF:', e);
                    // Fallback to original if processing fails
                }
            }
        }

        const response = new NextResponse(responseData);

        // Set headers for file download
        response.headers.set('Content-Type', document.fileType);
        response.headers.set(
            'Content-Disposition',
            `attachment; filename="${encodeURIComponent(document.fileName)}"`
        );
        response.headers.set('Content-Length', contentLength.toString());

        return response;

    } catch (error) {
        console.error('Error downloading document:', error);
        return NextResponse.json(
            { error: 'Failed to download document' },
            { status: 500 }
        );
    }
}
