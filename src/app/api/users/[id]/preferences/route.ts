import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 try {
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);
 if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

 const body = await request.json();

 // Allow updating preferences
 if (body.preferences) {
 // Ensure user creates their own preferences unless admin
 if (session.id !== id && session.role !== 'ADMIN') {
 return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 }

 const updated = await prisma.user.update({
 where: { id: id },
 data: {
 preferences: body.preferences
 }
 });

 return NextResponse.json({ success: true, user: updated });
 }

 return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

 } catch (error) {
 return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
 }
}

// Keep existing GET/PUT if any, but ensure we don't overwrite the whole file unless we know its content.
// The previous log showed 'api/users/[id]/route.ts' existed. I should have viewed it first.
// I WILL USE 'view_file' FIRST to avoid destroying existing logic in this file.
