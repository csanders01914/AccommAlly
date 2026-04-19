import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken as verifyTOTP } from '@/lib/totp';
import { loginUser, verifyToken as verifyJWT } from '@/lib/auth';
import { twoFactorRateLimiter } from '@/lib/rate-limit';

export async function POST(req: Request) {
    try {
        // Rate limit by IP
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
        const rateLimit = await twoFactorRateLimiter.check(ip);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: `Too many attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.` },
                { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
            );
        }

        const { pendingToken, token } = await req.json();

        if (!pendingToken || !token) {
            return NextResponse.json({ error: 'Missing pendingToken or token' }, { status: 400 });
        }

        // Verify the pending 2FA token issued during login
        const pending = await verifyJWT(pendingToken);
        if (!pending || pending.purpose !== '2fa_pending' || !pending.userId) {
            return NextResponse.json({ error: 'Invalid or expired pending token' }, { status: 401 });
        }

        const userId = pending.userId as string;
        const tenantId = pending.tenantId as string;

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        // Validate that the user actually belongs to the tenant claimed in the pending token
        if (user.tenantId !== tenantId) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const isValid = verifyTOTP(token, user.twoFactorSecret);
        if (!isValid) {
            // Check recovery codes (stored as bcrypt hashes)
            const { comparePassword } = await import('@/lib/auth');
            let recoveryCodeMatch = -1;

            for (let i = 0; i < user.twoFactorRecoveryCodes.length; i++) {
                const matches = await comparePassword(token, user.twoFactorRecoveryCodes[i]);
                if (matches) {
                    recoveryCodeMatch = i;
                    break;
                }
            }

            if (recoveryCodeMatch >= 0) {
                // Consume the matched recovery code by removing it from the array
                const newCodes = [...user.twoFactorRecoveryCodes];
                newCodes.splice(recoveryCodeMatch, 1);
                await prisma.user.update({
                    where: { id: user.id },
                    data: { twoFactorRecoveryCodes: newCodes }
                });
            } else {
                return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
            }
        }

        // Generate Session with tenantId
        const sessionUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId,
        };

        await loginUser(sessionUser); // Sets cookie

        return NextResponse.json({ user: sessionUser });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
