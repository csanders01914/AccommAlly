import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
    signSuperAdminToken,
    hashSuperAdminEmail
} from '@/lib/super-admin-auth';
import { comparePassword } from '@/lib/auth';
import { cookies } from 'next/headers';
import { createRateLimiter } from '@/lib/rate-limit';
import logger from '@/lib/logger';

// Super-admin login: 5 attempts per 15 minutes, keyed by email hash
const superAdminLimiter = createRateLimiter({
    maxRequests: 5,
    windowSeconds: 15 * 60,
    prefix: 'sa-login',
});

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        const emailHash = hashSuperAdminEmail(email);

        // Rate limit by email hash (prevents brute-force per account)
        const rateLimit = await superAdminLimiter.check(emailHash);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: `Account locked due to too many failed attempts. Try again in ${Math.ceil(rateLimit.retryAfterSeconds / 60)} minutes.` },
                { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
            );
        }

        // Find super admin by email hash
        const superAdmin = await prisma.superAdmin.findUnique({
            where: { emailHash },
        });

        if (!superAdmin || !superAdmin.active) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Verify password
        const isValid = await comparePassword(password, superAdmin.passwordHash);
        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Success — reset rate limit and update last login
        await superAdminLimiter.reset(emailHash);

        await prisma.superAdmin.update({
            where: { id: superAdmin.id },
            data: { lastLogin: new Date() },
        });

        // Generate token
        const token = await signSuperAdminToken({
            id: superAdmin.id,
            email: superAdmin.email,
            name: superAdmin.name,
        });

        // Set cookie
        const cookieStore = await cookies();
        cookieStore.set('super_admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 4, // 4 hours
        });

        return NextResponse.json({
            success: true,
            superAdmin: {
                id: superAdmin.id,
                name: superAdmin.name,
                email: superAdmin.email,
            },
        });
    } catch (error) {
        logger.error({ err: error }, 'Super-Admin login error:');
        return NextResponse.json(
            { error: 'Authentication failed' },
            { status: 500 }
        );
    }
}
