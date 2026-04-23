import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSuperAdminSession } from '@/lib/super-admin-auth';
import { SUPER_ADMIN_SESSION_COOKIE_NAME } from '@/lib/constants';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string, imageId: string }> }) {
 const cookieStore = await cookies();
 const token = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE_NAME)?.value;
 const session = await getSuperAdminSession(token);
 if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

 const { imageId } = await params;

 try {
 await prisma.affiliateProductImage.delete({
 where: { id: imageId }
 });
 return NextResponse.json({ success: true });
 } catch (e) {
 logger.error({ err: e }, 'Error deleting image:');
 return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
 }
}
