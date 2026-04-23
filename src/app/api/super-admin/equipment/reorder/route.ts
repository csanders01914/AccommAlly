import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSuperAdminSession } from '@/lib/super-admin-auth';
import { SUPER_ADMIN_SESSION_COOKIE_NAME } from '@/lib/constants';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
 const cookieStore = await cookies();
 const token = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE_NAME)?.value;
 const session = await getSuperAdminSession(token);
 if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

 try {
 const body = await request.json();
 const { orderedIds } = body; // Array of product IDs in their new order

 if (!orderedIds || !Array.isArray(orderedIds)) {
 return NextResponse.json({ error: 'orderedIds array is required' }, { status: 400 });
 }

 // We run updates in a transaction
 await prisma.$transaction(
 orderedIds.map((id, index) => 
 prisma.affiliateProduct.update({
 where: { id },
 data: { order: index }
 })
 )
 );

 return NextResponse.json({ success: true });
 } catch (e) {
 logger.error({ err: e }, 'Error reordering equipment:');
 return NextResponse.json({ error: 'Failed to reorder equipment' }, { status: 500 });
 }
}
