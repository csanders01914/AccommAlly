import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { verifyCredential } from '@/lib/claimant';

/**
 * POST /api/claimants/[id]/verify - Verify PIN/passphrase
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { credential, caseId, noteId } = body;

        if (!credential) {
            return NextResponse.json({ error: 'Credential is required' }, { status: 400 });
        }

        // Find claimant by ID or claimantNumber
        const claimant = await prisma.claimant.findFirst({
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
            await prisma.identityVerification.create({
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
        console.error('Error verifying claimant:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
