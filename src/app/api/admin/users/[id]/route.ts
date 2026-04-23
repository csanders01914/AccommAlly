import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import { encrypt, hash } from '@/lib/encryption';
import logger from '@/lib/logger';

export async function PATCH(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
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
 const { name, email, role, active, lock } = body;

 const updateData: any = {};

 // Update basic fields
 if (name) updateData.name = name;
 if (role) updateData.role = role;
 if (typeof active === 'boolean') updateData.active = active;

 // Update Email (requires re-hashing/encrypting)
 if (email) {
 updateData.email = encrypt(email);
 updateData.emailHash = hash(email.toLowerCase().trim());

 // Check uniqueness within tenant
 const existing = await tenantPrisma.user.findFirst({
 where: {
 emailHash: updateData.emailHash,
 NOT: { id } // Exclude self
 }
 });
 if (existing) {
 return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
 }
 }

 // Handle Locking
 if (lock === true) {
 updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30m
 } else if (lock === false) {
 updateData.lockedUntil = null;
 updateData.loginAttempts = 0;
 }

 const updatedUser = await tenantPrisma.user.update({
 where: { id },
 data: updateData,
 select: {
 id: true,
 name: true,
 role: true,
 active: true,
 lockedUntil: true,
 updatedAt: true,
 }
 });

 // Audit Log
 await tenantPrisma.auditLog.create({
 data: {
 entityType: 'User',
 entityId: id,
 action: 'UPDATE',
 metadata: JSON.stringify({
 name, email: email ? 'UPDATED' : undefined, role, active, lock
 }),
 userId: session.id as string,
 tenantId: session.tenantId,
 }
 });

 return NextResponse.json({ success: true, user: updatedUser });

 } catch (error) {
 logger.error({ err: error }, 'Admin User Update Error:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}

export async function DELETE(
 request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 try {
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);
 if (!session || session.role !== 'ADMIN') {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 const { id } = await params;

 // Check if user exists within this tenant
 const user = await tenantPrisma.user.findUnique({
 where: { id },
 include: {
 _count: {
 select: {
 auditLogs: true,
 createdCases: true,
 assignedTasks: true
 }
 }
 }
 });

 if (!user) {
 return NextResponse.json({ error: 'User not found' }, { status: 404 });
 }

 // Check dependencies
 const hasHistory = user._count.auditLogs > 0 || user._count.createdCases > 0 || user._count.assignedTasks > 0;

 if (hasHistory) {
 return NextResponse.json({
 error: 'Cannot delete user with associated history (Cases, Tasks, or Logs). Deactivate them instead.'
 }, { status: 409 });
 }

 // Perform Delete — tenantPrisma ensures only own-tenant users can be deleted
 await tenantPrisma.user.delete({
 where: { id }
 });

 // Audit Log
 await tenantPrisma.auditLog.create({
 data: {
 entityType: 'User',
 entityId: id,
 action: 'DELETE',
 metadata: JSON.stringify({ name: user.name, email: 'DELETED' }),
 userId: session.id as string,
 tenantId: session.tenantId,
 }
 });

 return NextResponse.json({ success: true });

 } catch (error) {
 logger.error({ err: error }, 'Admin User Delete Error:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
