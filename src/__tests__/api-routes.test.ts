/**
 * Integration tests for critical API route handlers.
 * Tests call route handlers directly without an HTTP server.
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
    __esModule: true,
    default: {
        case: {
            findFirst: jest.fn(),
        },
        user: {
            findFirst: jest.fn(),
            update: jest.fn().mockResolvedValue({}),
        },
        auditLog: {
            create: jest.fn().mockResolvedValue({}),
        },
        rateLimit: {
            upsert: jest.fn(),
            findUnique: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
        },
    },
    prisma: {
        case: {
            findFirst: jest.fn(),
        },
        user: {
            findFirst: jest.fn(),
            update: jest.fn().mockResolvedValue({}),
        },
        auditLog: {
            create: jest.fn().mockResolvedValue({}),
        },
        rateLimit: {
            upsert: jest.fn(),
            findUnique: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
        },
    },
}));

jest.mock('@/lib/claimant', () => ({
    __esModule: true,
    verifyCredential: jest.fn().mockResolvedValue(false),
    generateClaimantNumber: jest.fn().mockResolvedValue('123456'),
}));

// Mock rate-limit with spyable jest.fn() methods — tests override .check() per scenario
jest.mock('@/lib/rate-limit', () => {
    const allowedResult = { allowed: true, remaining: 9, resetAt: 0, retryAfterSeconds: 0 };
    const makeLimiter = () => ({ check: jest.fn().mockResolvedValue(allowedResult), reset: jest.fn(), peek: jest.fn() });
    return {
        __esModule: true,
        createRateLimiter: jest.fn(),
        loginRateLimiter: makeLimiter(),
        twoFactorRateLimiter: makeLimiter(),
        portalLoginRateLimiter: makeLimiter(),
        apiRateLimiter: makeLimiter(),
        passwordResetRateLimiter: makeLimiter(),
    };
});

// --- Portal Login ---
describe('POST /api/public/portal/login', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Restore default allowed behavior after clearAllMocks resets call state
        const rl = jest.requireMock('@/lib/rate-limit') as typeof import('@/lib/rate-limit');
        (rl.portalLoginRateLimiter.check as jest.Mock).mockResolvedValue(
            { allowed: true, remaining: 9, resetAt: Date.now() + 900000, retryAfterSeconds: 0 }
        );
        const prisma = jest.requireMock('@/lib/prisma');
        (prisma.default.case.findFirst as jest.Mock).mockResolvedValue(null);
        (prisma.prisma.case.findFirst as jest.Mock).mockResolvedValue(null);
    });

    it('returns 400 when required fields are missing', async () => {
        const { POST } = await import('@/app/api/public/portal/login/route');
        const req = new NextRequest('http://localhost/api/public/portal/login', {
            method: 'POST',
            body: JSON.stringify({}),
            headers: { 'content-type': 'application/json' },
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('returns 429 when rate limit exceeded', async () => {
        const rl = jest.requireMock('@/lib/rate-limit') as typeof import('@/lib/rate-limit');
        (rl.portalLoginRateLimiter.check as jest.Mock).mockResolvedValue({
            allowed: false,
            remaining: 0,
            resetAt: Date.now() + 900000,
            retryAfterSeconds: 900,
        });

        const { POST } = await import('@/app/api/public/portal/login/route');
        const req = new NextRequest('http://localhost/api/public/portal/login', {
            method: 'POST',
            body: JSON.stringify({ identifier: 'CASE-001', lastName: 'Smith', pin: '1234' }),
            headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
        });
        const res = await POST(req);
        expect(res.status).toBe(429);
    });

    it('returns 401 for unknown case number', async () => {
        // findFirst already returns null from beforeEach — case not found → 401

        const { POST } = await import('@/app/api/public/portal/login/route');
        const req = new NextRequest('http://localhost/api/public/portal/login', {
            method: 'POST',
            body: JSON.stringify({ identifier: 'NOTEXIST', lastName: 'Smith', pin: '1234' }),
            headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
    });
});

// --- Auth Login ---
describe('POST /api/auth/login', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Restore default allowed behavior after clearAllMocks resets call state
        const rl = jest.requireMock('@/lib/rate-limit') as typeof import('@/lib/rate-limit');
        (rl.loginRateLimiter.check as jest.Mock).mockResolvedValue(
            { allowed: true, remaining: 9, resetAt: Date.now() + 900000, retryAfterSeconds: 0 }
        );
        const prisma = jest.requireMock('@/lib/prisma');
        (prisma.default.user.findFirst as jest.Mock).mockResolvedValue(null);
        (prisma.prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    });

    it('returns 400 when body is empty', async () => {
        const { POST } = await import('@/app/api/auth/login/route');
        const req = new NextRequest('http://localhost/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({}),
            headers: { 'content-type': 'application/json' },
        });
        const res = await POST(req);
        expect([400, 401]).toContain(res.status);
    });

    it('returns 429 when rate limit exceeded', async () => {
        const rl = jest.requireMock('@/lib/rate-limit') as typeof import('@/lib/rate-limit');
        (rl.loginRateLimiter.check as jest.Mock).mockResolvedValue({
            allowed: false,
            remaining: 0,
            resetAt: Date.now() + 900000,
            retryAfterSeconds: 900,
        });

        const { POST } = await import('@/app/api/auth/login/route');
        const req = new NextRequest('http://localhost/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: 'test@example.com', password: 'wrong' }),
            headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
        });
        const res = await POST(req);
        expect(res.status).toBe(429);
    });
});
