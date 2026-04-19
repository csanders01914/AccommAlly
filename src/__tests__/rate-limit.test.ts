import { createRateLimiter } from '@/lib/rate-limit';

jest.mock('@/lib/prisma', () => ({
    __esModule: true,
    default: {
        rateLimit: {
            upsert: jest.fn(),
            findUnique: jest.fn(),
            delete: jest.fn(),
        },
    },
    prisma: {
        rateLimit: {
            upsert: jest.fn(),
            findUnique: jest.fn(),
            delete: jest.fn(),
        },
    },
}));

import prisma from '@/lib/prisma';

describe('createRateLimiter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('allows a request when under the limit', async () => {
        const now = Date.now();
        (prisma.rateLimit.upsert as jest.Mock).mockResolvedValue({
            count: 1,
            resetAt: new Date(now + 60000),
        });

        const limiter = createRateLimiter({ maxRequests: 5, windowSeconds: 60, prefix: 'test' });
        const result = await limiter.check('test-ip');

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4);
    });

    it('blocks a request when over the limit', async () => {
        const now = Date.now();
        (prisma.rateLimit.upsert as jest.Mock).mockResolvedValue({
            count: 6,
            resetAt: new Date(now + 30000),
        });

        const limiter = createRateLimiter({ maxRequests: 5, windowSeconds: 60, prefix: 'test' });
        const result = await limiter.check('test-ip');

        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('returns a Promise from check()', () => {
        (prisma.rateLimit.upsert as jest.Mock).mockResolvedValue({
            count: 1,
            resetAt: new Date(Date.now() + 60000),
        });
        const limiter = createRateLimiter({ maxRequests: 5, windowSeconds: 60, prefix: 'test' });
        expect(limiter.check('ip')).toBeInstanceOf(Promise);
    });
});
