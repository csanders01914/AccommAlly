import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { encryptionExtension } from './prisma-extension';
import 'server-only';

const globalForPrisma = globalThis as unknown as {
    prisma_v2: any; // Type is 'any' to support the extended client in global scope
    pool: pg.Pool | undefined;
};

// Create connection pool
const pool = globalForPrisma.pool ?? new pg.Pool({
    connectionString: process.env.STORAGE_DATABASE_URL || process.env.DATABASE_URL,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Create base Prisma client
const basePrisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Create extended client
export const prisma = globalForPrisma.prisma_v2 ?? basePrisma.$extends(encryptionExtension);

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma_v2 = prisma;
    globalForPrisma.pool = pool;
}

export default prisma;
