import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSuperAdminSession } from '@/lib/super-admin-auth';
import { SUPER_ADMIN_SESSION_COOKIE_NAME } from '@/lib/constants';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
 const cookieStore = await cookies();
 const token = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE_NAME)?.value;
 const session = await getSuperAdminSession(token);
 if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

 const id = (await params).id;

 try {
 const body = await request.json();
 const product = await prisma.affiliateProduct.update({
 where: { id },
 data: {
 title: body.title,
 description: body.description,
 productUrl: body.productUrl,
 category: body.category,
 price: body.price ? parseFloat(body.price.toString().replace(/[^0-9.]/g, '')) : null,
 active: body.active,
 }
 });
 return NextResponse.json(product);
 } catch (e) {
 logger.error({ err: e }, 'Error updating equipment:');
 return NextResponse.json({ error: 'Failed to update equipment' }, { status: 500 });
 }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
 const cookieStore = await cookies();
 const token = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE_NAME)?.value;
 const session = await getSuperAdminSession(token);
 if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

 const id = (await params).id;

 try {
 // Find the item to be deleted so we know its order
 const itemToDelete = await prisma.affiliateProduct.findUnique({
 where: { id }
 });

 if (!itemToDelete) {
 return NextResponse.json({ error: 'Not found' }, { status: 404 });
 }

 await prisma.affiliateProduct.delete({
 where: { id }
 });

 // Reorder subsequent items to close the gap
 await prisma.affiliateProduct.updateMany({
 where: {
 order: {
 gt: itemToDelete.order
 }
 },
 data: {
 order: {
 decrement: 1
 }
 }
 });

 return NextResponse.json({ success: true });
 } catch (e) {
 logger.error({ err: e }, 'Error deleting equipment:');
 return NextResponse.json({ error: 'Failed to delete equipment' }, { status: 500 });
 }
}
