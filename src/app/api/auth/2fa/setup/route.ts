
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import prisma from '@/lib/prisma';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import logger from '@/lib/logger';

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

function getSetupKey(): Uint8Array {
 const raw = process.env.JWT_SECRET;
 if (!raw && process.env.NODE_ENV === 'production') {
 throw new Error('FATAL: JWT_SECRET is required in production.');
 }
 return new TextEncoder().encode(raw || 'default_dev_secret_key_change_me');
}

/** Sign the TOTP secret into a short-lived token so the client cannot substitute their own */
async function signSetupToken(userId: string, secret: string): Promise<string> {
 return new SignJWT({ userId, secret, purpose: '2fa_setup' })
 .setProtectedHeader({ alg: 'HS256' })
 .setExpirationTime('10m')
 .sign(getSetupKey());
}

/** Verify and extract the TOTP secret from the setup token */
async function verifySetupToken(token: string): Promise<{ userId: string; secret: string } | null> {
 try {
 const { payload } = await jwtVerify(token, getSetupKey(), { algorithms: ['HS256'] });
 if (payload.purpose !== '2fa_setup' || !payload.userId || !payload.secret) return null;
 return { userId: payload.userId as string, secret: payload.secret as string };
 } catch {
 return null;
 }
}

export async function POST(req: NextRequest) {
 try {
 const { session, error } = await requireAuth({ request: req });
 if (error) return error;

 const body = await req.json();
 const { action, token, setupToken } = body;

 const user = await prisma.user.findUnique({
 where: { id: session.id }
 });

 if (!user) {
 return NextResponse.json({ error: 'User not found' }, { status: 404 });
 }

 if (action === 'generate') {
 const newSecret = generateSecret();

 const totp = new OTPAuth.TOTP({
 issuer: 'AccessAlly',
 label: user.email,
 algorithm: 'SHA1',
 digits: 6,
 period: 30,
 secret: newSecret
 });

 const otpauthUrl = totp.toString();
 const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

 // Return a signed setup token instead of the raw secret — prevents client substitution
 const signedSetupToken = await signSetupToken(user.id, newSecret);

 return NextResponse.json({ setupToken: signedSetupToken, qrCodeUrl });
 }

 if (action === 'enable') {
 if (!token || !setupToken) {
 return NextResponse.json({ error: 'Missing token or setupToken' }, { status: 400 });
 }

 // Verify the server-signed setup token to recover the secret
 const setup = await verifySetupToken(setupToken);
 if (!setup || setup.userId !== session.id) {
 return NextResponse.json({ error: 'Invalid or expired setup token' }, { status: 400 });
 }

 const totp = new OTPAuth.TOTP({
 issuer: 'AccessAlly',
 label: user.email,
 algorithm: 'SHA1',
 digits: 6,
 period: 30,
 secret: setup.secret
 });

 const delta = totp.validate({ token, window: 1 });

 if (delta === null) {
 return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
 }

 const recoveryCodes = Array.from({ length: 10 }, () =>
 crypto.randomBytes(5).toString('hex').toUpperCase()
 );

 const { hashPassword } = await import('@/lib/auth');
 const hashedCodes = await Promise.all(
 recoveryCodes.map(code => hashPassword(code))
 );

 await prisma.user.update({
 where: { id: user.id },
 data: {
 twoFactorEnabled: true,
 twoFactorSecret: setup.secret,
 twoFactorRecoveryCodes: hashedCodes
 }
 });

 return NextResponse.json({ success: true, recoveryCodes });
 }

 if (action === 'disable') {
 // Require current TOTP token to disable 2FA — prevents session hijack from disabling 2FA
 if (!token) {
 return NextResponse.json({ error: 'Current TOTP token is required to disable 2FA' }, { status: 400 });
 }

 if (!user.twoFactorEnabled || !user.twoFactorSecret) {
 return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 });
 }

 const totp = new OTPAuth.TOTP({
 issuer: 'AccessAlly',
 label: user.email,
 algorithm: 'SHA1',
 digits: 6,
 period: 30,
 secret: user.twoFactorSecret
 });

 const delta = totp.validate({ token, window: 1 });

 if (delta === null) {
 // Also check recovery codes
 const { comparePassword } = await import('@/lib/auth');
 let recoveryMatch = false;
 for (const code of user.twoFactorRecoveryCodes) {
 if (await comparePassword(token, code)) {
 recoveryMatch = true;
 break;
 }
 }
 if (!recoveryMatch) {
 return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
 }
 }

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
 logger.error({ err: error }, '2FA Setup Error:');
 return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
 }
}
