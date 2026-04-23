import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
 try {
 // Fetch active equipment ordered by order field
 const equipment = await prisma.affiliateProduct.findMany({
 where: { active: true },
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
 logger.error({ err: e }, 'Error fetching equipment:');
 return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 });
 }
}
