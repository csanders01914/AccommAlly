import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { portalLoginRateLimiter } from '@/lib/rate-limit';
import { hashCredential, validatePin, generateClaimantNumber, createNameHash } from '@/lib/claimant';
import { encrypt } from '@/lib/encryption';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import logger from '@/lib/logger';

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

    const { organizationCode, firstName, lastName, birthdate, email, password, confirmPassword, pin } =
      await request.json();

    if (!organizationCode || !firstName || !lastName || !birthdate || !email || !password || !pin) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    if (confirmPassword !== undefined && confirmPassword !== password) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    if (!validatePin(pin)) {
      return NextResponse.json({ error: 'PIN must be 4–6 digits' }, { status: 400 });
    }

    // Look up tenant by slug
    const tenant = await prisma.tenant.findFirst({
      where: { slug: organizationCode.trim().toLowerCase(), status: 'ACTIVE' },
      select: { id: true },
    });
    if (!tenant) {
      return NextResponse.json(
        { error: 'Organization code not found. Please check the code provided by your employer.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailHash = crypto.createHash('sha256').update(normalizedEmail).digest('hex');

    // Reject if email is already used by another account
    const emailTaken = await prisma.claimant.findFirst({ where: { emailHash } });
    if (emailTaken) {
      return NextResponse.json(
        { error: 'This email address is already associated with an account. Please log in.' },
        { status: 409 }
      );
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const nameHash = createNameHash(fullName);

    const birthdateObj = new Date(birthdate);
    if (isNaN(birthdateObj.getTime())) {
      return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const pinHash = await hashCredential(pin);
    const encryptedEmail = encrypt(normalizedEmail);
    const encryptedName = encrypt(fullName);

    // Check for an existing claimant record with the same name+DOB in this tenant
    // (e.g., staff pre-created the record). Link the self-registration to it.
    const existing = await prisma.claimant.findFirst({
      where: { tenantId: tenant.id, nameHash, birthdate: birthdateObj },
    });

    if (existing) {
      if (existing.passwordHash) {
        return NextResponse.json(
          { error: 'An account already exists for this name and date of birth. Please log in.' },
          { status: 409 }
        );
      }
      // Link self-registration to existing record
      await prisma.claimant.update({
        where: { id: existing.id },
        data: {
          email: encryptedEmail,
          emailHash,
          passwordHash,
          pinHash,
          credentialType: 'PIN',
        },
      });

      await prisma.auditLog.create({
        data: {
          entityType: 'Portal',
          entityId: existing.id,
          action: 'PORTAL_ACCOUNT_CREATED',
          tenantId: tenant.id,
          metadata: JSON.stringify({ linkedExisting: true, ip }),
        },
      }).catch(() => {});
    } else {
      // Create a fresh claimant record
      const claimantNumber = await generateClaimantNumber();

      const phoneHash = null;

      const newClaimant = await prisma.claimant.create({
        data: {
          tenantId: tenant.id,
          claimantNumber,
          name: encryptedName,
          nameHash,
          birthdate: birthdateObj,
          email: encryptedEmail,
          emailHash,
          phoneHash,
          passwordHash,
          pinHash,
          credentialType: 'PIN',
        },
        select: { id: true },
      });

      await prisma.auditLog.create({
        data: {
          entityType: 'Portal',
          entityId: newClaimant.id,
          action: 'PORTAL_ACCOUNT_CREATED',
          tenantId: tenant.id,
          metadata: JSON.stringify({ selfRegistered: true, ip }),
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Portal Register Error:');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
