import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import {
 RATE_LIMIT_LOGIN_WINDOW, RATE_LIMIT_LOGIN_MAX,
 RATE_LIMIT_2FA_WINDOW, RATE_LIMIT_2FA_MAX,
 RATE_LIMIT_PORTAL_WINDOW, RATE_LIMIT_PORTAL_MAX,
 RATE_LIMIT_API_WINDOW, RATE_LIMIT_API_MAX,
 RATE_LIMIT_PASSWORD_RESET_WINDOW, RATE_LIMIT_PASSWORD_RESET_MAX,
} from '@/lib/constants';

interface RateLimiterConfig {
 maxRequests: number;
 windowSeconds: number;
 prefix?: string;
}

interface RateLimitResult {
 allowed: boolean;
 remaining: number;
 resetAt: number;
 retryAfterSeconds: number;
}

export function createRateLimiter(config: RateLimiterConfig) {
 const { maxRequests, windowSeconds, prefix = 'rl' } = config;

 return {
 async check(identifier: string): Promise<RateLimitResult> {
 const key = `${prefix}:${identifier}`;
 const now = new Date();
 const resetAt = new Date(now.getTime() + windowSeconds * 1000);

 try {
 const record = await prisma.rateLimit.upsert({
 where: { key },
 create: { key, count: 1, resetAt },
 update: { count: { increment: 1 } },
 select: { count: true, resetAt: true },
 });

 // If the stored resetAt has passed, the window expired — reset to fresh window.
 if (record.resetAt <= now) {
 await prisma.rateLimit.update({
 where: { key },
 data: { count: 1, resetAt },
 });
 return {
 allowed: true,
 remaining: maxRequests - 1,
 resetAt: resetAt.getTime(),
 retryAfterSeconds: 0,
 };
 }

 const allowed = record.count <= maxRequests;
 const remaining = Math.max(0, maxRequests - record.count);
 const retryAfterSeconds = allowed
 ? 0
 : Math.ceil((record.resetAt.getTime() - now.getTime()) / 1000);

 return { allowed, remaining, resetAt: record.resetAt.getTime(), retryAfterSeconds };
 } catch (e) {
 logger.error({ err: e }, '[rate-limit] DB error — failing open');
 return {
 allowed: true,
 remaining: maxRequests,
 resetAt: resetAt.getTime(),
 retryAfterSeconds: 0,
 };
 }
 },

 async reset(identifier: string): Promise<void> {
 await prisma.rateLimit.delete({
 where: { key: `${prefix}:${identifier}` },
 }).catch(() => {});
 },

 async peek(identifier: string): Promise<RateLimitResult> {
 const key = `${prefix}:${identifier}`;
 const now = new Date();
 const defaultResult: RateLimitResult = {
 allowed: true,
 remaining: maxRequests,
 resetAt: new Date(now.getTime() + windowSeconds * 1000).getTime(),
 retryAfterSeconds: 0,
 };

 try {
 const record = await prisma.rateLimit.findUnique({ where: { key } });

 if (!record || record.resetAt <= now) {
 return defaultResult;
 }

 const allowed = record.count < maxRequests;
 return {
 allowed,
 remaining: Math.max(0, maxRequests - record.count),
 resetAt: record.resetAt.getTime(),
 retryAfterSeconds: allowed ? 0 : Math.ceil((record.resetAt.getTime() - now.getTime()) / 1000),
 };
 } catch (e) {
 logger.error({ err: e }, '[rate-limit] DB error — failing open');
 return defaultResult;
 }
 },
 };
}

export const loginRateLimiter = createRateLimiter({ maxRequests: RATE_LIMIT_LOGIN_MAX, windowSeconds: RATE_LIMIT_LOGIN_WINDOW, prefix: 'login' });
export const twoFactorRateLimiter = createRateLimiter({ maxRequests: RATE_LIMIT_2FA_MAX, windowSeconds: RATE_LIMIT_2FA_WINDOW, prefix: '2fa' });
export const portalLoginRateLimiter = createRateLimiter({ maxRequests: RATE_LIMIT_PORTAL_MAX, windowSeconds: RATE_LIMIT_PORTAL_WINDOW, prefix: 'portal' });
export const apiRateLimiter = createRateLimiter({ maxRequests: RATE_LIMIT_API_MAX, windowSeconds: RATE_LIMIT_API_WINDOW, prefix: 'api' });
export const passwordResetRateLimiter = createRateLimiter({ maxRequests: RATE_LIMIT_PASSWORD_RESET_MAX, windowSeconds: RATE_LIMIT_PASSWORD_RESET_WINDOW, prefix: 'pwreset' });
