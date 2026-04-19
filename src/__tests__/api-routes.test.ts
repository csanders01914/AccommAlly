/**
 * Integration tests for critical API route handlers.
 * Tests call route handlers directly without an HTTP server.
 */

import { NextRequest } from 'next/server';

// Single shared mock object — both `default` and `prisma` exports point to the same reference
// so seeding either one affects both, preventing silent divergence after clearAllMocks.
const prismaMock = {
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
};

jest.mock('@/lib/prisma', () => ({
    __esModule: true,
    default: prismaMock,
    prisma: prismaMock,
}));

const verifyCredentialMock = jest.fn().mockResolvedValue(false);
jest.mock('@/lib/claimant', () => ({
    __esModule: true,
    verifyCredential: verifyCredentialMock,
    generateClaimantNumber: jest.fn().mockResolvedValue('123456'),
}));

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
        // Restore default implementations cleared by clearAllMocks
        const rl = jest.requireMock('@/lib/rate-limit') as typeof import('@/lib/rate-limit');
        (rl.portalLoginRateLimiter.check as jest.Mock).mockResolvedValue(
            { allowed: true, remaining: 9, resetAt: Date.now() + 900000, retryAfterSeconds: 0 }
        );
        prismaMock.case.findFirst.mockResolvedValue(null);
        prismaMock.auditLog.create.mockResolvedValue({});
        verifyCredentialMock.mockResolvedValue(false);
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
        // findFirst returns null from beforeEach — case not found → 401
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
        // Restore default implementations cleared by clearAllMocks
        const rl = jest.requireMock('@/lib/rate-limit') as typeof import('@/lib/rate-limit');
        (rl.loginRateLimiter.check as jest.Mock).mockResolvedValue(
            { allowed: true, remaining: 9, resetAt: Date.now() + 900000, retryAfterSeconds: 0 }
        );
        prismaMock.user.findFirst.mockResolvedValue(null);
        prismaMock.user.update.mockResolvedValue({});
        prismaMock.auditLog.create.mockResolvedValue({});
    });

    it('returns 400 when required fields are missing', async () => {
        const { POST } = await import('@/app/api/auth/login/route');
        const req = new NextRequest('http://localhost/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({}),
            headers: { 'content-type': 'application/json' },
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
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
