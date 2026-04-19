import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { portalLoginRateLimiter } from '@/lib/rate-limit';
import { verifyCredential } from '@/lib/claimant';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        // Rate limit by IP
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
        const rateLimit = await portalLoginRateLimiter.check(ip);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: `Too many attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.` },
                { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
            );
        }

        const { identifier, lastName, pin } = await request.json();

        if (!identifier || !lastName || !pin) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        // Find Case by Claim Number OR Claimant ID, including linked claimant
        const targetCase = await prisma.case.findFirst({
            where: {
                OR: [
                    { caseNumber: { equals: identifier, mode: 'insensitive' } },
                    { claimantRef: identifier }
                ]
            },
            include: {
                claimant: {
                    select: {
                        id: true,
                        pinHash: true,
                        passphraseHash: true,
                        credentialType: true,
                    }
                }
            }
        });

        // Use a generic error message for case-not-found to prevent case number enumeration
        const invalidCredentialsResponse = NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

        if (!targetCase) {
            return invalidCredentialsResponse;
        }

        // Verify Last Name — use dedicated field; fall back to splitting for legacy cases without clientLastName
        const caseLastName = targetCase.clientLastName
            ?? targetCase.clientName.trim().split(/\s+/).pop()
            ?? '';

        if (caseLastName.toLowerCase() !== lastName.toLowerCase()) {
            await prisma.auditLog.create({
                data: {
                    entityType: 'Portal',
                    entityId: targetCase.id,
                    action: 'PORTAL_LOGIN_FAILED',
                    tenantId: targetCase.tenantId,
                    metadata: JSON.stringify({ reason: 'last_name_mismatch', ip }),
                }
            }).catch(() => {});
            return invalidCredentialsResponse;
        }

        // Require a linked claimant with a PIN set
        const claimant = targetCase.claimant;
        if (!claimant) {
            return NextResponse.json(
                { error: 'Portal access is not yet set up for this case. Please contact your examiner.' },
                { status: 403 }
            );
        }

        const credentialHash = claimant.credentialType === 'PIN'
            ? claimant.pinHash
            : claimant.passphraseHash;

        if (!credentialHash) {
            return NextResponse.json(
                { error: 'No PIN has been set for this case. Please contact your examiner to enable portal access.' },
                { status: 403 }
            );
        }

        // Verify the PIN / passphrase
        const pinValid = await verifyCredential(pin, credentialHash);
        if (!pinValid) {
            await prisma.auditLog.create({
                data: {
                    entityType: 'Portal',
                    entityId: targetCase.id,
                    action: 'PORTAL_LOGIN_FAILED',
                    tenantId: targetCase.tenantId,
                    metadata: JSON.stringify({ reason: 'invalid_pin', ip }),
                }
            }).catch(() => {});
            return invalidCredentialsResponse;
        }

        // All factors verified — issue portal token
        const token = await signToken({
            claimantId: claimant.id,
            caseId: targetCase.id,
            tenantId: targetCase.tenantId,
            role: 'CLAIMANT',
            purpose: 'portal',
        });

        const cookieStore = await cookies();
        const isSecure = request.nextUrl.protocol === 'https:';

        cookieStore.set('portal_token', token, {
            httpOnly: true,
            secure: isSecure,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60, // 1 hour
        });

        await prisma.auditLog.create({
            data: {
                entityType: 'Portal',
                entityId: targetCase.id,
                action: 'PORTAL_LOGIN_SUCCESS',
                tenantId: targetCase.tenantId,
                metadata: JSON.stringify({ claimantId: claimant.id, ip }),
            }
        }).catch(() => {});

        return NextResponse.json({ success: true });

    } catch (error) {
        logger.error({ err: error }, 'Portal Login Error:');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
