import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signPortalToken } from '@/lib/portal-auth';
import { cookies } from 'next/headers';
import { portalLoginRateLimiter } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import logger from '@/lib/logger';
import { PORTAL_SESSION_COOKIE_NAME, PORTAL_SESSION_MAX_AGE_SECONDS } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimit = await portalLoginRateLimiter.check(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const invalidResponse = NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });

    const emailHash = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');

    const claimant = await prisma.claimant.findFirst({
      where: { emailHash },
      select: {
        id: true,
        tenantId: true,
        passwordHash: true,
      },
    });

    if (!claimant || !claimant.passwordHash) {
      return invalidResponse;
    }

    const passwordValid = await bcrypt.compare(password, claimant.passwordHash);
    if (!passwordValid) {
      await prisma.auditLog.create({
        data: {
          entityType: 'Portal',
          entityId: claimant.id,
          action: 'PORTAL_LOGIN_FAILED',
          tenantId: claimant.tenantId,
          metadata: JSON.stringify({ reason: 'invalid_password', ip }),
        },
      }).catch(() => {});
      return invalidResponse;
    }

    const token = await signPortalToken({
      claimantId: claimant.id,
      tenantId: claimant.tenantId,
      role: 'CLAIMANT',
      purpose: 'portal',
    });

    const cookieStore = await cookies();
    const isSecure = request.nextUrl.protocol === 'https:';

    cookieStore.set(PORTAL_SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: PORTAL_SESSION_MAX_AGE_SECONDS,
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'Portal',
        entityId: claimant.id,
        action: 'PORTAL_LOGIN_SUCCESS',
        tenantId: claimant.tenantId,
        metadata: JSON.stringify({ ip }),
      },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Portal Login Error:');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
