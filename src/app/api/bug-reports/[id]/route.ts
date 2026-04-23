import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import { logError } from '@/lib/logging';

export async function PATCH(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> } // Params are promises in Next.js 16
) {
 try {
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);
 if (!session || session.role !== 'ADMIN') {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 const { id } = await params;
 const body = await request.json();
 const { status } = body;

 if (!status) {
 return NextResponse.json({ error: 'Missing status' }, { status: 400 });
 }

 const updatedReport = await prisma.bugReport.update({
 where: { id },
 data: { status }
 });

 return NextResponse.json({ success: true, report: updatedReport });

 } catch (error) {
 await logError(error, { path: '/api/bug-reports/[id]', method: 'PATCH' });
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
