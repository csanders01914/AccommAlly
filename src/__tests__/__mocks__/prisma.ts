/**
 * Manual mock for '@/lib/prisma'.
 * All Prisma model methods are jest.fn() so tests can spy/mock them per-test.
 */
const makeMockModel = () => ({
 findFirst: jest.fn(),
 findUnique: jest.fn(),
 findMany: jest.fn(),
 create: jest.fn().mockResolvedValue({}),
 update: jest.fn(),
 upsert: jest.fn(),
 delete: jest.fn(),
 deleteMany: jest.fn(),
 count: jest.fn(),
});

const prismaMock = {
 case: makeMockModel(),
 claimant: makeMockModel(),
 user: makeMockModel(),
 auditLog: makeMockModel(),
 rateLimit: makeMockModel(),
 tenant: makeMockModel(),
 document: makeMockModel(),
 task: makeMockModel(),
};

export default prismaMock;
export const prisma = prismaMock;
