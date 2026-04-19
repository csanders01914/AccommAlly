/**
 * Seed script to create the initial Super-Admin user
 * Run with: npx tsx prisma/seed-super-admin.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Must match hashSuperAdminEmail() in src/lib/super-admin-auth.ts → src/lib/encryption.ts
// That function uses HMAC-SHA256 with the ENCRYPTION_KEY, not plain SHA256
function hashSHA256(data: string): string {
    const rawKey = (process.env.ENCRYPTION_KEY || '').trim().replace(/^["']|["']$/g, '').substring(0, 64);
    if (!rawKey || rawKey.length !== 64) throw new Error('ENCRYPTION_KEY required for email hashing');
    return crypto.createHmac('sha256', Buffer.from(rawKey, 'hex')).update(data).digest('hex');
}

async function main() {
    const email = 'csanders0191@proton.me';
    const name = 'Chris Sanders';
    const password = 'Password123!';

    const emailHash = hashSHA256(email.toLowerCase().trim());
    const passwordHash = await bcrypt.hash(password, 12);

    // Delete any existing super admin with this email before recreating
    await prisma.superAdmin.deleteMany({ where: { email } });

    await prisma.superAdmin.create({
        data: {
            email,
            emailHash,
            name,
            passwordHash,
            active: true,
        },
    });

    console.log('\n========================================');
    console.log('  SUPER-ADMIN SEEDED SUCCESSFULLY');
    console.log('========================================\n');
    console.log('  Name:', name);
    console.log('  Email:', email);
    console.log('  Login at: /super-admin/login');
    console.log('========================================\n');
}

main()
    .catch((e) => {
        console.error('Error seeding Super-Admin:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
