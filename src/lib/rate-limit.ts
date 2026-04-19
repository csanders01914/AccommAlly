import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

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

export const loginRateLimiter = createRateLimiter({ maxRequests: 5, windowSeconds: 15 * 60, prefix: 'login' });
export const twoFactorRateLimiter = createRateLimiter({ maxRequests: 5, windowSeconds: 5 * 60, prefix: '2fa' });
export const portalLoginRateLimiter = createRateLimiter({ maxRequests: 10, windowSeconds: 15 * 60, prefix: 'portal' });
export const apiRateLimiter = createRateLimiter({ maxRequests: 100, windowSeconds: 60, prefix: 'api' });
export const passwordResetRateLimiter = createRateLimiter({ maxRequests: 3, windowSeconds: 60 * 60, prefix: 'pwreset' });
