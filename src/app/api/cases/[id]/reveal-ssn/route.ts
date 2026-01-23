import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { getSession } from '@/lib/auth';

/**
 * GET /api/cases/[id]/reveal-ssn
 * Reveal the full decrypted SSN for a case
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const session = await getSession();

        if (!session || (session.role !== 'ADMIN' && session.role !== 'COORDINATOR')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Verify user exists in DB (handle stale sessions after seed/wipe)
        const userExists = await prisma.user.findUnique({
            where: { id: session.id as string },
            select: { id: true }
        });

        if (!userExists) {
            return NextResponse.json({ error: 'Session invalid or expired. Please log in again.' }, { status: 401 });
        }

        const caseData = await prisma.case.findUnique({
            where: { id },
            select: {
                clientSSN: true,
                clientSSNPrefix: true,
                clientSSNSuffix: true,
                id: true
            }
        });

        if (!caseData) {
            console.error('Case not found for ID:', id);
            return NextResponse.json(
                { error: 'Case not found' },
                { status: 404 }
            );
        }

        let decryptedSSN: string | null = null;

        try {
            if (caseData.clientSSNPrefix && caseData.clientSSNSuffix) {
                const prefix = decrypt(caseData.clientSSNPrefix);
                const suffix = decrypt(caseData.clientSSNSuffix);
                const full = prefix + suffix;
                // Reformat as SSN 000-00-0000
                if (full.length === 9) {
                    decryptedSSN = `${full.slice(0, 3)}-${full.slice(3, 5)}-${full.slice(5)}`;
                } else {
                    decryptedSSN = full; // Should not happen ideally
                }
            } else if (caseData.clientSSN) {
                decryptedSSN = decrypt(caseData.clientSSN);
            }
        } catch (decryptError) {
            console.error('Decryption failed:', decryptError);
            // Continue, will return null or empty ssn
        }


        const auditUserId = session.id;

        // Log the access
        await prisma.auditLog.create({
            data: {
                entityType: 'Case',
                entityId: id,
                action: 'REVEAL_SSN',
                userId: auditUserId,
                metadata: JSON.stringify({ ip: request.headers.get('x-forwarded-for') || 'unknown' }),
            }
        });

        return NextResponse.json({ ssn: decryptedSSN });

    } catch (error) {
        console.error('Error revealing SSN:', error);
        return NextResponse.json(
            { error: 'Failed to reveal SSN', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
