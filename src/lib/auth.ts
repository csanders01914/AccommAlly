import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import logger from '@/lib/logger';
import { SESSION_COOKIE_NAME, SESSION_DURATION, SESSION_MAX_AGE_SECONDS } from '@/lib/constants';

const ALG = "HS256";

// Lazy secret key initialization to avoid crashing at build time
let _secretKey: Uint8Array | null = null;
function getSecretKey(): Uint8Array {
    if (!_secretKey) {
        const rawSecret = process.env.JWT_SECRET;
        if (!rawSecret && process.env.NODE_ENV === 'production') {
            throw new Error('FATAL: JWT_SECRET environment variable is required in production.');
        }
        if (!rawSecret) {
            logger.warn('SECURITY WARNING: JWT_SECRET not set. Using insecure default for development only.');
        }
        _secretKey = new TextEncoder().encode(rawSecret || 'default_dev_secret_key_change_me');
    }
    return _secretKey;
}

export async function signToken(payload: Record<string, unknown>) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: ALG })
        .setExpirationTime(SESSION_DURATION)
        .sign(getSecretKey());
}

export async function verifyToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, getSecretKey(), {
            algorithms: [ALG],
        });
        return payload;
    } catch (error) {
        return null;
    }
}

export async function hashPassword(password: string) {
    return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifyToken(token);
}

export async function loginUser(userData: { id: string; email: string; role: string; tenantId: string; name?: string; isSecure?: boolean }) {
    const { isSecure, ...tokenPayload } = userData;
    const token = await signToken(tokenPayload);
    const cookieStore = await cookies();

    // Default to strict production check if isSecure is undefined
    const useSecureCookie = isSecure !== undefined
        ? isSecure
        : process.env.NODE_ENV === "production";

    cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: useSecureCookie,
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return token;
}

export async function logoutUser() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}
