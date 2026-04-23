import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSuperAdminSession } from '@/lib/super-admin-auth';
import { SUPER_ADMIN_SESSION_COOKIE_NAME } from '@/lib/constants';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
 const cookieStore = await cookies();
 const token = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE_NAME)?.value;
 const session = await getSuperAdminSession(token);
 if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

 try {
 const equipment = await prisma.affiliateProduct.findMany({
 orderBy: { order: 'asc' },
 include: {
 images: {
 select: { id: true, order: true },
 orderBy: { order: 'asc' }
 }
 }
 });
 return NextResponse.json(equipment);
 } catch (e) {
 logger.error({ err: e }, 'Error fetching admin equipment:');
 return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 });
 }
}

export async function POST(request: NextRequest) {
 const cookieStore = await cookies();
 const token = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE_NAME)?.value;
 const session = await getSuperAdminSession(token);
 if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

 try {
 const body = await request.json();
 const maxOrderItem = await prisma.affiliateProduct.findFirst({
 orderBy: { order: 'desc' }
 });
 const newOrder = maxOrderItem ? maxOrderItem.order + 1 : 0;

 const product = await prisma.affiliateProduct.create({
 data: {
 title: body.title,
 description: body.description || null,
 productUrl: body.productUrl,
 category: body.category || null,
 price: body.price ? parseFloat(body.price.toString().replace(/[^0-9.]/g, '')) : null,
 active: body.active ?? true,
 order: newOrder,
 }
 });
 return NextResponse.json(product);
 } catch (e) {
 logger.error({ err: e }, 'Error creating equipment:');
 return NextResponse.json({ error: 'Failed to create equipment' }, { status: 500 });
 }
}
