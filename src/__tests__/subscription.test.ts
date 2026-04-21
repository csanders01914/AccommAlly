import { NextRequest } from 'next/server';

// ── Shared mock session ────────────────────────────────────────────────────
const mockSession = {
    id: 'user-1',
    email: 'admin@example.com',
    role: 'ADMIN',
    tenantId: 'tenant-1',
    name: 'Admin User',
};

// ── Mock requireAuth ───────────────────────────────────────────────────────
const requireAuthMock = jest.fn().mockResolvedValue({ session: mockSession, error: null });
jest.mock('@/lib/require-auth', () => ({
    requireAuth: (...args: any[]) => requireAuthMock(...args),
}));

// ── Mock Prisma ────────────────────────────────────────────────────────────
const prismaMock = {
    tenant: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({}),
    },
    subscriptionPlan: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
    },
    user: {
        count: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({}),
    },
    case: {
        count: jest.fn(),
    },
};
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: prismaMock }));

// ── Mock Stripe ────────────────────────────────────────────────────────────
const stripeMock = {
    customers: {
        create: jest.fn(),
        retrieve: jest.fn(),
    },
    subscriptions: {
        create: jest.fn(),
        cancel: jest.fn().mockResolvedValue({}),
    },
    billingPortal: { sessions: { create: jest.fn() } },
    webhooks: { constructEvent: jest.fn() },
};
jest.mock('@/lib/stripe', () => ({ stripe: stripeMock }));

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/subscription
// ═══════════════════════════════════════════════════════════════════════════

describe('GET /api/subscription', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 401 when not authenticated', async () => {
        requireAuthMock.mockResolvedValueOnce({
            session: null,
            error: { status: 401, json: async () => ({ error: 'Unauthorized' }) },
        });
        const { GET } = await import('@/app/api/subscription/route');
        const req = new NextRequest('http://localhost/api/subscription');
        const res = await GET(req as any);
        expect(res.status).toBe(401);
    });

    it('returns plan and usage for authenticated admin', async () => {
        const mockPlan = { id: 'plan-1', code: 'PRO', name: 'Professional', maxUsers: 10, maxActiveClaims: 100 };
        prismaMock.tenant.findUnique.mockResolvedValueOnce({
            subscriptionPlan: mockPlan,
            subscriptionStatus: 'active',
            currentPeriodEnd: new Date('2026-05-20'),
            billingInterval: 'monthly',
        });
        prismaMock.user.count.mockResolvedValueOnce(4);
        prismaMock.case.count.mockResolvedValueOnce(67);

        const { GET } = await import('@/app/api/subscription/route');
        const req = new NextRequest('http://localhost/api/subscription');
        const res = await GET(req as any);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.plan.code).toBe('PRO');
        expect(data.subscriptionStatus).toBe('active');
        expect(data.usage.activeUsers).toBe(4);
        expect(data.usage.openClaims).toBe(67);
    });

    it('falls back to FREE plan when tenant has no planId', async () => {
        prismaMock.tenant.findUnique.mockResolvedValueOnce({
            subscriptionPlan: null,
            subscriptionStatus: null,
            currentPeriodEnd: null,
            billingInterval: null,
        });
        prismaMock.subscriptionPlan.findUnique.mockResolvedValueOnce({
            id: 'plan-free', code: 'FREE', name: 'Free', maxUsers: 1, maxActiveClaims: 10,
        });
        prismaMock.user.count.mockResolvedValueOnce(1);
        prismaMock.case.count.mockResolvedValueOnce(3);

        const { GET } = await import('@/app/api/subscription/route');
        const req = new NextRequest('http://localhost/api/subscription');
        const res = await GET(req as any);
        const data = await res.json();

        expect(data.plan.code).toBe('FREE');
        expect(data.subscriptionStatus).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/subscription/create
// ═══════════════════════════════════════════════════════════════════════════

describe('POST /api/subscription/create', () => {
    beforeEach(() => jest.clearAllMocks());

    const makeReq = (body: object) =>
        new NextRequest('http://localhost/api/subscription/create', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'content-type': 'application/json' },
        });

    it('returns 400 for invalid planCode', async () => {
        prismaMock.subscriptionPlan.findUnique.mockResolvedValueOnce(null);
        const { POST } = await import('@/app/api/subscription/create/route');
        const res = await POST(makeReq({ planCode: 'INVALID', interval: 'monthly' }) as any);
        expect(res.status).toBe(400);
    });

    it('initial subscribe: creates customer and returns clientSecret', async () => {
        prismaMock.subscriptionPlan.findUnique.mockResolvedValueOnce({
            id: 'plan-1', code: 'STARTER', stripePriceIdMonthly: 'price_starter_mo', stripePriceIdYearly: 'price_starter_yr',
        });
        prismaMock.tenant.findUnique.mockResolvedValueOnce({
            id: 'tenant-1', stripeCustomerId: null, stripeSubscriptionId: null,
        });
        stripeMock.customers.create.mockResolvedValueOnce({ id: 'cus_new' });
        stripeMock.subscriptions.create.mockResolvedValueOnce({
            id: 'sub_new',
            latest_invoice: { amount_due: 700, payment_intent: { client_secret: 'pi_secret_123' } },
        });

        const { POST } = await import('@/app/api/subscription/create/route');
        const res = await POST(makeReq({ planCode: 'STARTER', interval: 'monthly' }) as any);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.requiresCardInput).toBe(true);
        expect(data.clientSecret).toBe('pi_secret_123');
        expect(data.amountCents).toBe(700);
        expect(stripeMock.customers.create).toHaveBeenCalledWith(
            expect.objectContaining({ metadata: { tenantId: 'tenant-1' } })
        );
    });

    it('upgrade: cancels old sub and returns requiresCardInput false', async () => {
        prismaMock.subscriptionPlan.findUnique.mockResolvedValueOnce({
            id: 'plan-2', code: 'PRO', stripePriceIdMonthly: 'price_pro_mo', stripePriceIdYearly: 'price_pro_yr',
        });
        prismaMock.tenant.findUnique.mockResolvedValueOnce({
            id: 'tenant-1', stripeCustomerId: 'cus_existing', stripeSubscriptionId: 'sub_old',
        });
        stripeMock.customers.retrieve.mockResolvedValueOnce({
            id: 'cus_existing',
            invoice_settings: { default_payment_method: 'pm_saved' },
        });
        stripeMock.subscriptions.create.mockResolvedValueOnce({
            id: 'sub_new',
            latest_invoice: { amount_due: 7500 },
        });

        const { POST } = await import('@/app/api/subscription/create/route');
        const res = await POST(makeReq({ planCode: 'PRO', interval: 'monthly' }) as any);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.requiresCardInput).toBe(false);
        expect(data.amountCents).toBe(7500);
        expect(stripeMock.subscriptions.cancel).toHaveBeenCalledWith('sub_old');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/subscription/downgrade
// ═══════════════════════════════════════════════════════════════════════════

describe('POST /api/subscription/downgrade', () => {
    beforeEach(() => jest.clearAllMocks());

    const makeReq = (body: object) =>
        new NextRequest('http://localhost/api/subscription/downgrade', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'content-type': 'application/json' },
        });

    const starterPlan = { id: 'plan-starter', code: 'STARTER', maxUsers: 3, maxActiveClaims: 25, stripePriceIdMonthly: 'price_st_mo', stripePriceIdYearly: 'price_st_yr' };

    it('preflight: blocks when open claims exceed new plan limit', async () => {
        prismaMock.subscriptionPlan.findUnique.mockResolvedValueOnce(starterPlan);
        prismaMock.case.count.mockResolvedValueOnce(30); // over 25 limit

        const { POST } = await import('@/app/api/subscription/downgrade/route');
        const res = await POST(makeReq({ planCode: 'STARTER', interval: 'monthly' }) as any);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.claimsBlocked).toBe(true);
        expect(data.currentClaims).toBe(30);
        expect(data.maxClaims).toBe(25);
    });

    it('preflight: returns usersToPickFrom when users exceed new plan limit', async () => {
        prismaMock.subscriptionPlan.findUnique.mockResolvedValueOnce(starterPlan);
        prismaMock.case.count.mockResolvedValueOnce(10); // within 25 limit
        prismaMock.user.findMany.mockResolvedValueOnce([
            { id: 'user-1', name: 'Alice', role: 'ADMIN' },
            { id: 'user-2', name: 'Bob', role: 'COORDINATOR' },
            { id: 'user-3', name: 'Carol', role: 'COORDINATOR' },
            { id: 'user-4', name: 'Dave', role: 'COORDINATOR' },
        ]); // 4 users, limit is 3 → must deactivate 1

        const { POST } = await import('@/app/api/subscription/downgrade/route');
        const res = await POST(makeReq({ planCode: 'STARTER', interval: 'monthly' }) as any);
        const data = await res.json();

        expect(data.usersToPickFrom).toHaveLength(4);
        expect(data.mustDeactivateCount).toBe(1);
    });

    it('preflight: returns ok when within all limits', async () => {
        prismaMock.subscriptionPlan.findUnique.mockResolvedValueOnce(starterPlan);
        prismaMock.case.count.mockResolvedValueOnce(10);
        prismaMock.user.findMany.mockResolvedValueOnce([
            { id: 'user-1', name: 'Alice', role: 'ADMIN' },
            { id: 'user-2', name: 'Bob', role: 'COORDINATOR' },
        ]); // 2 users, limit is 3 → ok

        const { POST } = await import('@/app/api/subscription/downgrade/route');
        const res = await POST(makeReq({ planCode: 'STARTER', interval: 'monthly' }) as any);
        const data = await res.json();

        expect(data.ok).toBe(true);
    });

    it('actual downgrade: deactivates users and switches subscription', async () => {
        prismaMock.subscriptionPlan.findUnique.mockResolvedValueOnce(starterPlan);
        prismaMock.case.count.mockResolvedValueOnce(10);
        prismaMock.user.findMany.mockResolvedValueOnce([
            { id: 'user-1', name: 'Alice', role: 'ADMIN' },
            { id: 'user-2', name: 'Bob', role: 'COORDINATOR' },
            { id: 'user-3', name: 'Carol', role: 'COORDINATOR' },
            { id: 'user-4', name: 'Dave', role: 'COORDINATOR' },
        ]);
        prismaMock.tenant.findUnique.mockResolvedValueOnce({
            stripeCustomerId: 'cus_abc', stripeSubscriptionId: 'sub_old',
        });
        stripeMock.customers.retrieve.mockResolvedValueOnce({
            invoice_settings: { default_payment_method: 'pm_saved' },
        });
        stripeMock.subscriptions.create.mockResolvedValueOnce({ id: 'sub_new' });

        const { POST } = await import('@/app/api/subscription/downgrade/route');
        const res = await POST(makeReq({
            planCode: 'STARTER',
            interval: 'monthly',
            confirm: true,
            usersToDeactivate: ['user-4'],
        }) as any);
        const data = await res.json();

        expect(data.success).toBe(true);
        expect(prismaMock.user.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: { active: false } })
        );
        expect(stripeMock.subscriptions.cancel).toHaveBeenCalledWith('sub_old');
    });

    it('actual downgrade: rejects self-deactivation', async () => {
        prismaMock.subscriptionPlan.findUnique.mockResolvedValueOnce(starterPlan);
        prismaMock.case.count.mockResolvedValueOnce(10);
        prismaMock.user.findMany.mockResolvedValueOnce([
            { id: 'user-1', name: 'Alice', role: 'ADMIN' },
            { id: 'user-2', name: 'Bob', role: 'COORDINATOR' },
            { id: 'user-3', name: 'Carol', role: 'COORDINATOR' },
            { id: 'user-4', name: 'Dave', role: 'COORDINATOR' },
        ]);

        const { POST } = await import('@/app/api/subscription/downgrade/route');
        // mockSession.id is 'user-1'
        const res = await POST(makeReq({
            planCode: 'STARTER',
            interval: 'monthly',
            confirm: true,
            usersToDeactivate: ['user-1'],
        }) as any);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/cannot deactivate your own account/i);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/subscription/portal
// ═══════════════════════════════════════════════════════════════════════════

describe('POST /api/subscription/portal', () => {
    beforeEach(() => jest.clearAllMocks());

    const makeReq = () =>
        new NextRequest('http://localhost/api/subscription/portal', {
            method: 'POST',
            body: JSON.stringify({}),
            headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
        });

    it('returns 400 when tenant has no stripeCustomerId', async () => {
        prismaMock.tenant.findUnique.mockResolvedValueOnce({ stripeCustomerId: null });
        const { POST } = await import('@/app/api/subscription/portal/route');
        const res = await POST(makeReq() as any);
        expect(res.status).toBe(400);
    });

    it('returns portal URL', async () => {
        prismaMock.tenant.findUnique.mockResolvedValueOnce({ stripeCustomerId: 'cus_abc' });
        stripeMock.billingPortal.sessions.create.mockResolvedValueOnce({
            url: 'https://billing.stripe.com/session/xyz',
        });
        const { POST } = await import('@/app/api/subscription/portal/route');
        const res = await POST(makeReq() as any);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.url).toBe('https://billing.stripe.com/session/xyz');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/webhooks/stripe
// ═══════════════════════════════════════════════════════════════════════════

describe('POST /api/webhooks/stripe', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    });

    const makeReq = (body: string, sig = 'valid-sig') =>
        new NextRequest('http://localhost/api/webhooks/stripe', {
            method: 'POST',
            body,
            headers: { 'stripe-signature': sig },
        });

    it('returns 400 for invalid signature', async () => {
        stripeMock.webhooks.constructEvent.mockImplementationOnce(() => {
            throw new Error('Invalid signature');
        });
        const { POST } = await import('@/app/api/webhooks/stripe/route');
        const res = await POST(makeReq('{}') as any);
        expect(res.status).toBe(400);
    });

    it('subscription.updated: updates tenant status and syncs plan', async () => {
        const event = {
            type: 'customer.subscription.updated',
            data: {
                object: {
                    id: 'sub_123',
                    status: 'active',
                    customer: 'cus_abc',
                    current_period_end: 1748736000,
                    items: { data: [{ price: { id: 'price_pro_mo', recurring: { interval: 'month' } } }] },
                },
            },
        };
        stripeMock.webhooks.constructEvent.mockReturnValueOnce(event);
        prismaMock.subscriptionPlan.findFirst.mockResolvedValueOnce({
            id: 'plan-pro', code: 'PRO',
        });

        const { POST } = await import('@/app/api/webhooks/stripe/route');
        const res = await POST(makeReq(JSON.stringify(event)) as any);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.received).toBe(true);
        expect(prismaMock.tenant.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { stripeCustomerId: 'cus_abc' },
                data: expect.objectContaining({ subscriptionStatus: 'active' }),
            })
        );
    });

    it('subscription.deleted: reverts to FREE plan', async () => {
        const event = {
            type: 'customer.subscription.deleted',
            data: {
                object: { id: 'sub_123', customer: 'cus_abc' },
            },
        };
        stripeMock.webhooks.constructEvent.mockReturnValueOnce(event);
        prismaMock.subscriptionPlan.findUnique.mockResolvedValueOnce({
            id: 'plan-free', code: 'FREE',
        });

        const { POST } = await import('@/app/api/webhooks/stripe/route');
        const res = await POST(makeReq(JSON.stringify(event)) as any);

        expect(prismaMock.tenant.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    subscriptionStatus: 'canceled',
                    stripeSubscriptionId: null,
                    plan: 'FREE',
                }),
            })
        );
    });

    it('invoice.payment_failed: sets past_due', async () => {
        const event = {
            type: 'invoice.payment_failed',
            data: { object: { customer: 'cus_abc' } },
        };
        stripeMock.webhooks.constructEvent.mockReturnValueOnce(event);

        const { POST } = await import('@/app/api/webhooks/stripe/route');
        await POST(makeReq(JSON.stringify(event)) as any);

        expect(prismaMock.tenant.updateMany).toHaveBeenCalledWith({
            where: { stripeCustomerId: 'cus_abc' },
            data: { subscriptionStatus: 'past_due' },
        });
    });
});
