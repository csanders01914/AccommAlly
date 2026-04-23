import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, loginUser, signToken } from "@/lib/auth";
import { loginRateLimiter } from "@/lib/rate-limit";
import { ACCOUNT_LOCKOUT_DURATION_SECONDS, RATE_LIMIT_LOGIN_MAX } from "@/lib/constants";
import logger from '@/lib/logger';

export async function POST(request: Request) {
 try {
 // Rate limit by IP
 const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
 const rateLimit = await loginRateLimiter.check(ip);
 if (!rateLimit.allowed) {
 return NextResponse.json(
 { error: `Too many login attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.` },
 { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
 );
 }

 const body = await request.json();
 const { email, password } = body;

 if (!email || !password) {
 return NextResponse.json({ error: "Email and password required" }, { status: 400 });
 }

 // 1. Find user by hashed email (blind indexing)
 // The Prisma encryption extension automatically converts email -> emailHash for lookup
 const normalizedEmail = email.toLowerCase().trim();

 const user = await prisma.user.findFirst({
 where: { email: normalizedEmail },
 include: { tenant: true }
 });

 if (!user) {
 return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
 }

 // 2. Check Lockout
 if (user.lockedUntil && user.lockedUntil > new Date()) {
 // Audit Log: Login Blocked
 await prisma.auditLog.create({
 data: {
 entityType: 'User',
 entityId: user.id,
 action: 'LOGIN_BLOCKED',
 userId: user.id,
 tenantId: user.tenantId,
 metadata: JSON.stringify({ reason: 'account_locked', lockedUntil: user.lockedUntil })
 }
 });

 return NextResponse.json(
 { error: "Account locked. Try again later." },
 { status: 403 }
 );
 }

 // 3. Verify Password
 if (!user.passwordHash) {
 return NextResponse.json({ error: "Account setup incomplete" }, { status: 401 });
 }

 const isValid = await comparePassword(password, user.passwordHash);

 if (!isValid) {
 // Increment attempts
 const newAttempts = user.loginAttempts + 1;
 const updateData: { loginAttempts: number; lockedUntil?: Date } = { loginAttempts: newAttempts };

 if (newAttempts >= RATE_LIMIT_LOGIN_MAX) {
 updateData.lockedUntil = new Date(Date.now() + ACCOUNT_LOCKOUT_DURATION_SECONDS * 1000);
 }

 await prisma.user.update({
 where: { id: user.id },
 data: updateData
 });

 // Audit Log: Login Failure
 await prisma.auditLog.create({
 data: {
 entityType: 'User',
 entityId: user.id,
 action: 'LOGIN_FAILURE',
 userId: user.id,
 tenantId: user.tenantId,
 metadata: JSON.stringify({ reason: 'invalid_password', attempts: newAttempts })
 }
 });

 return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
 }

 // 4. Success: Reset stats & Check 2FA
 await prisma.user.update({
 where: { id: user.id },
 data: {
 loginAttempts: 0,
 lastLogin: new Date(),
 lockedUntil: null
 }
 });

 // 2FA Check — issue a short-lived pending token instead of exposing userId
 if (user.twoFactorEnabled) {
 const pendingToken = await signToken({
 userId: user.id,
 tenantId: user.tenantId,
 purpose: '2fa_pending',
 });
 return NextResponse.json({
 twoFactorRequired: true,
 pendingToken,
 });
 }

 const isSecure = request.url.startsWith("https:");

 await loginUser({
 id: user.id,
 email: email,
 role: user.role,
 tenantId: user.tenantId,
 name: user.name,
 isSecure
 });

 // Audit Log: Login Success
 await prisma.auditLog.create({
 data: {
 entityType: 'User',
 entityId: user.id,
 action: 'LOGIN_SUCCESS',
 userId: user.id,
 tenantId: user.tenantId,
 metadata: JSON.stringify({ ip: request.headers.get('x-forwarded-for') || 'unknown' })
 }
 });

 const userData = {
 id: user.id,
 name: user.name,
 role: user.role,
 tenant: {
 id: user.tenant.id,
 name: user.tenant.name,
 settings: user.tenant.settings
 }
 };
 return NextResponse.json({ success: true, user: userData });

 } catch (error) {
 logger.error({ err: error }, "Login Error:");
 return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
 }
}
