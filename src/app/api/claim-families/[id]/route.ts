import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import logger from '@/lib/logger';

/**
 * PATCH /api/claim-families/[id] - Add/remove cases from family
 */
export async function PATCH(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const { id } = await params;
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);

 if (!session) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 const body = await request.json();
 const { name, addCaseIds, removeCaseIds } = body;

 const family = await prisma.claimFamily.findUnique({
 where: { id }
 });

 if (!family) {
 return NextResponse.json({ error: 'Claim family not found' }, { status: 404 });
 }

 // Build update data
 const updateData: any = {};

 if (name !== undefined) {
 updateData.name = name;
 }

 if (addCaseIds && Array.isArray(addCaseIds) && addCaseIds.length > 0) {
 updateData.cases = {
 ...updateData.cases,
 connect: addCaseIds.map((caseId: string) => ({ id: caseId }))
 };

 // Audit logs for added cases
 for (const caseId of addCaseIds) {
 await prisma.auditLog.create({
 data: {
 entityType: 'Case',
 entityId: caseId,
 action: 'UPDATE',
 field: 'claimFamilyId',
 newValue: id,
 metadata: JSON.stringify({ action: 'link_to_family' }),
 userId: session.id,
 }
 });
 }
 }

 if (removeCaseIds && Array.isArray(removeCaseIds) && removeCaseIds.length > 0) {
 updateData.cases = {
 ...updateData.cases,
 disconnect: removeCaseIds.map((caseId: string) => ({ id: caseId }))
 };

 // Audit logs for removed cases
 for (const caseId of removeCaseIds) {
 await prisma.auditLog.create({
 data: {
 entityType: 'Case',
 entityId: caseId,
 action: 'UPDATE',
 field: 'claimFamilyId',
 oldValue: id,
 newValue: null,
 metadata: JSON.stringify({ action: 'unlink_from_family' }),
 userId: session.id,
 }
 });
 }
 }

 const updated = await prisma.claimFamily.update({
 where: { id },
 data: updateData,
 include: {
 cases: {
 select: {
 id: true,
 caseNumber: true,
 title: true
 }
 }
 }
 });

 return NextResponse.json(updated);
 } catch (error) {
 logger.error({ err: error }, 'Error updating claim family:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}

/**
 * DELETE /api/claim-families/[id] - Delete a claim family (unlinks cases, doesn't delete them)
 */
export async function DELETE(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const { id } = await params;
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);

 if (!session) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 // First unlink all cases
 const family = await prisma.claimFamily.findUnique({
 where: { id },
 include: { cases: { select: { id: true } } }
 });

 if (!family) {
 return NextResponse.json({ error: 'Claim family not found' }, { status: 404 });
 }

 // Unlink cases
 await prisma.case.updateMany({
 where: { claimFamilyId: id },
 data: { claimFamilyId: null }
 });

 // Delete the family
 await prisma.claimFamily.delete({
 where: { id }
 });

 return NextResponse.json({ success: true });
 } catch (error) {
 logger.error({ err: error }, 'Error deleting claim family:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
