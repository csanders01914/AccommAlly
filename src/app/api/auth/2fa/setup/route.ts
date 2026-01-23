
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

// Generate a random base32 secret
function generateSecret(length = 20): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    const randomBytes = new Uint8Array(length);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < length; i++) {
        secret += chars[randomBytes[i] % chars.length];
    }
    return secret;
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { action, token, secret } = body;

        const user = await prisma.user.findUnique({
            where: { id: session.id }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (action === 'generate') {
            // Generate Secret
            const newSecret = generateSecret();

            // Create TOTP instance
            const totp = new OTPAuth.TOTP({
                issuer: 'AccessAlly',
                label: user.email,
                algorithm: 'SHA1',
                digits: 6,
                period: 30,
                secret: newSecret
            });

            // Generate otpauth URL
            const otpauthUrl = totp.toString();

            // Generate QR Code
            const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

            return NextResponse.json({ secret: newSecret, qrCodeUrl });
        }

        if (action === 'enable') {
            if (!token || !secret) {
                return NextResponse.json({ error: 'Missing token or secret' }, { status: 400 });
            }

            // Create TOTP instance with provided secret
            const totp = new OTPAuth.TOTP({
                issuer: 'AccessAlly',
                label: user.email,
                algorithm: 'SHA1',
                digits: 6,
                period: 30,
                secret: secret
            });

            // Verify Token (returns delta or null)
            const delta = totp.validate({ token, window: 1 });

            if (delta === null) {
                return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
            }

            // Generate Recovery Codes (10 codes, 10 hex chars each)
            const recoveryCodes = Array.from({ length: 10 }, () =>
                Math.random().toString(36).substring(2, 12).toUpperCase()
            );

            // Save to DB
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    twoFactorEnabled: true,
                    twoFactorSecret: secret,
                    twoFactorRecoveryCodes: recoveryCodes
                }
            });

            return NextResponse.json({ success: true, recoveryCodes });
        }

        if (action === 'disable') {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    twoFactorEnabled: false,
                    twoFactorSecret: null,
                    twoFactorRecoveryCodes: []
                }
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('2FA Setup Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
