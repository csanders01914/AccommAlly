import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/totp';
import { loginUser } from '@/lib/auth';
import { SignJWT } from 'jose';

export async function POST(req: Request) {
    try {
        const { userId, token } = await req.json();

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const isValid = verifyToken(token, user.twoFactorSecret);
        if (!isValid) {
            // Check recovery codes
            if (user.twoFactorRecoveryCodes.includes(token)) {
                // consume code
                const newCodes = user.twoFactorRecoveryCodes.filter((c: string) => c !== token);
                await prisma.user.update({
                    where: { id: user.id },
                    data: { twoFactorRecoveryCodes: newCodes }
                });
            } else {
                return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
            }
        }

        // Generate Session
        const sessionUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        };

        await loginUser(sessionUser); // Sets cookie

        return NextResponse.json({ user: sessionUser });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
