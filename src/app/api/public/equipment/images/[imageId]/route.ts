import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ imageId: string }> }) {
 const { imageId } = await params;
 
 try {
 const image = await prisma.affiliateProductImage.findUnique({
 where: { id: imageId }
 });
 
 if (!image) {
 return new NextResponse('Image not found', { status: 404 });
 }
 
 return new NextResponse(image.fileData, {
 headers: {
 'Content-Type': image.fileType,
 'Cache-Control': 'public, max-age=31536000, immutable'
 }
 });
 } catch (e) {
 logger.error({ err: e }, 'Error fetching product image');
 return new NextResponse('Internal Server Error', { status: 500 });
 }
}
