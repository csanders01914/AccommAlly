import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash, decrypt } from '@/lib/encryption';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const targetEmail = searchParams.get('email')?.toLowerCase().trim();
        const shouldFix = searchParams.get('fix') === 'true';

        const allUsers = await prisma.user.findMany();

        const results = await Promise.all(allUsers.map(async (u: any) => {
            let decrypted = 'ERR';
            try { decrypted = decrypt(u.email); } catch (e) { }

            const normalizedDecrypted = decrypted.toLowerCase().trim();
            const computedHash = hash(normalizedDecrypted);
            const isHashMatch = computedHash === u.emailHash;

            let status = 'Unknown';
            if (!isHashMatch) {
                if (shouldFix) {
                    await prisma.user.update({
                        where: { id: u.id },
                        data: { emailHash: computedHash }
                    });
                    status = 'FIXED';
                } else {
                    status = 'MISMATCH';
                }
            } else {
                status = 'MATCH';
            }

            return {
                id: u.id,
                role: u.role,
                storedHash: u.emailHash.substring(0, 10) + '...',
                decryptedEmail: decrypted,
                computedHashMatch: isHashMatch,
                status,
                isTargetMatch: targetEmail ? normalizedDecrypted === targetEmail : undefined
            };
        }));

        return NextResponse.json({
            meta: {
                total: results.length,
                target: targetEmail,
                fixMode: shouldFix
            },
            data: results
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
