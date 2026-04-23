import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import { decrypt, encrypt } from '@/lib/encryption';
import { createNameHash, hashCredential, validatePin, validatePassphrase } from '@/lib/claimant';
import crypto from 'crypto';
import logger from '@/lib/logger';

/**
 * GET /api/claimants/[id] - Get claimant profile with all linked cases
 */
export async function GET(
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

 // Find claimant by ID or claimantNumber
 const claimant = await prisma.claimant.findFirst({
 where: {
 OR: [
 { id },
 { claimantNumber: id }
 ]
 },
 include: {
 cases: {
 orderBy: { createdAt: 'desc' },
 select: {
 id: true,
 caseNumber: true,
 title: true,
 description: true,
 status: true,
 program: true,
 createdAt: true,
 claimFamily: {
 select: { id: true, name: true }
 }
 }
 }
 }
 });

 if (!claimant) {
 return NextResponse.json({ error: 'Claimant not found' }, { status: 404 });
 }

 // Decrypt sensitive fields
 const response = {
 id: claimant.id,
 claimantNumber: claimant.claimantNumber,
 name: decrypt(claimant.name),
 birthdate: claimant.birthdate,
 email: claimant.email ? decrypt(claimant.email) : null,
 phone: claimant.phone ? decrypt(claimant.phone) : null,
 credentialType: claimant.credentialType,
 createdAt: claimant.createdAt,
 cases: claimant.cases
 };

 return NextResponse.json(response);
 } catch (error) {
 logger.error({ err: error }, 'Error fetching claimant:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}

/**
 * PATCH /api/claimants/[id] - Update claimant (ADMIN only)
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

 // Admin only
 if (session.role !== 'ADMIN') {
 return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
 }

 const body = await request.json();
 const { name, email, phone, credentialType, credential } = body;

 // Find existing claimant
 const existing = await prisma.claimant.findFirst({
 where: {
 OR: [
 { id },
 { claimantNumber: id }
 ]
 }
 });

 if (!existing) {
 return NextResponse.json({ error: 'Claimant not found' }, { status: 404 });
 }

 // Build update data
 const updateData: any = {};

 if (name) {
 updateData.name = encrypt(name);
 updateData.nameHash = createNameHash(name);
 }

 if (email !== undefined) {
 updateData.email = email ? encrypt(email) : null;
 updateData.emailHash = email
 ? crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
 : null;
 }

 if (phone !== undefined) {
 updateData.phone = phone ? encrypt(phone) : null;
 updateData.phoneHash = phone
 ? crypto.createHash('sha256').update(phone.replace(/\D/g, '')).digest('hex')
 : null;
 }

 // Update credential if provided
 if (credential) {
 const credType = credentialType || existing.credentialType;

 if (credType === 'PIN' && !validatePin(credential)) {
 return NextResponse.json({ error: 'PIN must be 4-6 digits' }, { status: 400 });
 }

 if (credType === 'PASSPHRASE' && !validatePassphrase(credential)) {
 return NextResponse.json({ error: 'Passphrase must be 12-65 characters' }, { status: 400 });
 }

 const credentialHash = await hashCredential(credential);
 updateData.credentialType = credType;
 updateData.pinHash = credType === 'PIN' ? credentialHash : null;
 updateData.passphraseHash = credType === 'PASSPHRASE' ? credentialHash : null;
 }

 const updated = await prisma.claimant.update({
 where: { id: existing.id },
 data: updateData
 });

 // Audit Log
 await prisma.auditLog.create({
 data: {
 entityType: 'Claimant',
 entityId: updated.id,
 action: 'UPDATE',
 metadata: JSON.stringify({ claimantNumber: updated.claimantNumber, updates: Object.keys(updateData) }),
 userId: session.id,
 }
 });

 return NextResponse.json({
 id: updated.id,
 claimantNumber: updated.claimantNumber,
 name: name || decrypt(existing.name),
 credentialType: updated.credentialType,
 updatedAt: updated.updatedAt
 });

 } catch (error) {
 logger.error({ err: error }, 'Error updating claimant:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
