import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

const ALLOWED_CONTENT_TYPES = new Set([
 'application/pdf',
 'image/jpeg',
 'image/png',
 'image/gif',
 'image/webp',
 'image/tiff',
 'application/msword',
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.ms-excel',
 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 'text/plain',
 'application/zip',
]);

function sanitizeContentType(fileType: string): string {
 return ALLOWED_CONTENT_TYPES.has(fileType) ? fileType : 'application/octet-stream';
}

/**
 * GET /api/documents/[id]/download - Download a document by ID
 */
export async function GET(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const { session, error } = await requireAuth();
 if (error) return error;

 const { id } = await params;
 const tenantPrisma = withTenantScope(prisma, session.tenantId);

 // Fetch document including binary data — tenantPrisma enforces tenant isolation
 const document = await tenantPrisma.document.findUnique({
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
 const annotations = await tenantPrisma.annotation.findMany({
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

 let color = rgb(1, 1, 0);
 let opacity = 0.4;

 const rgbaMatch = annotation.color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
 if (rgbaMatch) {
 const [_, r, g, b, a] = rgbaMatch;
 color = rgb(parseInt(r) / 255, parseInt(g) / 255, parseInt(b) / 255);
 opacity = parseFloat(a);
 }

 const x = (annotation.x / 100) * width;
 const w = (annotation.width / 100) * width;
 const h = (annotation.height / 100) * height;
 const y = height - ((annotation.y / 100) * height) - h;

 page.drawRectangle({ x, y, width: w, height: h, color, opacity });
 }
 }

 const modifiedPdfBytes = await pdfDoc.save();
 responseData = Buffer.from(modifiedPdfBytes);
 contentLength = responseData.length;
 } catch (e) {
 logger.error({ err: e }, 'Error flattening PDF:');
 }
 }
 }

 const response = new NextResponse(responseData);

 response.headers.set('Content-Type', sanitizeContentType(document.fileType));
 response.headers.set(
 'Content-Disposition',
 `attachment; filename="${encodeURIComponent(document.fileName)}"`
 );
 response.headers.set('Content-Length', contentLength.toString());
 response.headers.set('X-Content-Type-Options', 'nosniff');
 response.headers.set('Cache-Control', 'no-store, private');

 return response;

 } catch (error) {
 logger.error({ err: error }, 'Error downloading document:');
 return NextResponse.json(
 { error: 'Failed to download document' },
 { status: 500 }
 );
 }
}
