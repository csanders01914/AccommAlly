import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSuperAdminSession } from '@/lib/super-admin-auth';
import { SUPER_ADMIN_SESSION_COOKIE_NAME } from '@/lib/constants';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
 const cookieStore = await cookies();
 const token = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE_NAME)?.value;
 const session = await getSuperAdminSession(token);
 if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

 const { id } = await params;

 try {
 const formData = await request.formData();
 const files = formData.getAll('files') as File[];
 
 if (!files || files.length === 0) {
 return NextResponse.json({ error: 'No files provided' }, { status: 400 });
 }

 // Get current max order
 const maxOrderAgg = await prisma.affiliateProductImage.aggregate({
 where: { productId: id },
 _max: { order: true }
 });
 let currentOrder = (maxOrderAgg._max.order ?? -1) + 1;

 const results = [];
 for (const file of files) {
 const buffer = Buffer.from(await file.arrayBuffer());
 const created = await prisma.affiliateProductImage.create({
 data: {
 productId: id,
 fileName: file.name,
 fileType: file.type,
 fileData: buffer,
 order: currentOrder++
 },
 select: { id: true, order: true }
 });
 results.push(created);
 }

 return NextResponse.json({ success: true, images: results });
 } catch (e) {
 logger.error({ err: e }, 'Error uploading images:');
 return NextResponse.json({ error: 'Failed to upload images' }, { status: 500 });
 }
}
