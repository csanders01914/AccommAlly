import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { withTenantScope } from '@/lib/prisma-tenant';
import { verifyCredential } from '@/lib/claimant';
import logger from '@/lib/logger';

/**
 * POST /api/claimants/[id]/verify - Verify PIN/passphrase
 */
export async function POST(
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
 const { credential, caseId, noteId } = body;

 if (!credential) {
 return NextResponse.json({ error: 'Credential is required' }, { status: 400 });
 }

 // Find claimant by ID or claimantNumber — tenantPrisma scopes to current tenant
 const claimant = await tenantPrisma.claimant.findFirst({
 where: {
 OR: [
 { id },
 { claimantNumber: id }
 ]
 }
 });

 if (!claimant) {
 return NextResponse.json({ error: 'Claimant not found' }, { status: 404 });
 }

 // Get the appropriate hash based on credential type
 const hash = claimant.credentialType === 'PIN'
 ? claimant.pinHash
 : claimant.passphraseHash;

 if (!hash) {
 return NextResponse.json({
 verified: false,
 message: 'No credentials set for this claimant'
 });
 }

 // Verify the credential
 const verified = await verifyCredential(credential, hash);

 // Log the verification attempt if caseId provided
 if (caseId) {
 await tenantPrisma.identityVerification.create({
 data: {
 caseId,
 noteId: noteId || null,
 verified,
 verifiedById: session.id
 }
 });
 }

 return NextResponse.json({
 verified,
 credentialType: claimant.credentialType,
 claimantNumber: claimant.claimantNumber,
 message: verified ? 'Identity verified successfully' : 'Verification failed - incorrect credential'
 });

 } catch (error) {
 logger.error({ err: error }, 'Error verifying claimant:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
