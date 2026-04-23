import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
 try {
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);
 if (!session) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 // Return simplified list for dropdowns
 const users = await prisma.user.findMany({
 where: { active: true },
 select: {
 id: true,
 name: true,
 role: true,
 email: true, // Useful for showing contact info if needed
 },
 orderBy: { name: 'asc' }
 });

 return NextResponse.json(users);
 } catch (error) {
 logger.error({ err: error }, 'Users Fetch Error');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
