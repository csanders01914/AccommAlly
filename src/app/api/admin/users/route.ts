import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { decrypt, encrypt, hash } from '@/lib/encryption';
import logger from '@/lib/logger';

export async function GET() {
 try {
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);
 if (!session || session.role !== 'ADMIN') {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 const users = await tenantPrisma.user.findMany({
 select: {
 id: true,
 name: true,
 email: true,
 role: true,
 active: true,
 lastLogin: true,
 createdAt: true,
 lockedUntil: true
 },
 orderBy: { createdAt: 'desc' }
 });

 const decryptedUsers = users.map((u: any) => {
 let decryptedEmail = 'Encrypted';
 try {
 if (u.email) decryptedEmail = decrypt(u.email);
 } catch (e) {
 // Ignore decryption errors
 }
 return {
 ...u,
 email: decryptedEmail
 };
 });

 return NextResponse.json(decryptedUsers);
 } catch (error) {
 logger.error({ err: error }, 'Admin Users API Error:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}

export async function POST(request: NextRequest) {
 try {
 const { session, error } = await requireAuth();

 if (error) return error;

 const tenantPrisma = withTenantScope(prisma, session.tenantId);
 if (!session || session.role !== 'ADMIN') {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 }

 const body = await request.json();
 const { name, email, password, role } = body;

 if (!name || !email || !password || !role) {
 return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
 }

 const normalizedEmail = email.toLowerCase().trim();
 const emailHash = hash(normalizedEmail);

 // Check if user already exists within this tenant
 const existingUser = await tenantPrisma.user.findFirst({
 where: { emailHash }
 });

 if (existingUser) {
 return NextResponse.json({ error: 'User already exists' }, { status: 409 });
 }

 // Retrieve current user to get tenantId
 // Session only has minimal info, so we fetch the full user
 const currentUser = await prisma.user.findUnique({
 where: { id: session.id as string },
 select: { tenantId: true }
 });

 if (!currentUser) {
 return NextResponse.json({ error: 'Current user not found' }, { status: 401 });
 }

 const { tenantId } = currentUser;

 // Check Tenant User Limit
 const { checkTenantUserLimit } = await import('@/lib/tenant-limits');
 const canCreateUser = await checkTenantUserLimit(tenantId);

 if (!canCreateUser) {
 return NextResponse.json({ error: 'Subscription plan user limit reached' }, { status: 403 });
 }

 const hashedPassword = await hashPassword(password);

 // Pass plain email - the Prisma extension handles encryption and hashing automatically
 const newUser = await tenantPrisma.user.create({
 data: {
 tenantId,
 name,
 email: normalizedEmail, // Plain email - extension will encrypt/hash
 role,
 passwordHash: hashedPassword,
 active: true
 },
 select: {
 id: true,
 name: true,
 role: true,
 active: true,
 createdAt: true,
 }
 });

 // Audit Log
 await tenantPrisma.auditLog.create({
 data: {
 entityType: 'User',
 entityId: newUser.id,
 action: 'CREATE',
 metadata: JSON.stringify({ name, role }),
 userId: session.id as string,
 tenantId,
 }
 });

 return NextResponse.json(newUser);

 } catch (error) {
 logger.error({ err: error }, 'Create User Error:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
