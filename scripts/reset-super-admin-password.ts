import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

// Process key the same way as src/lib/encryption.ts
const rawKey = (process.env.ENCRYPTION_KEY || '').trim().replace(/^["']|["']$/g, '');
const ENCRYPTION_KEY = rawKey.substring(0, 64);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function getKey() {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
        console.error('Invalid ENCRYPTION_KEY in script. Length:', ENCRYPTION_KEY?.length);
        throw new Error('Invalid ENCRYPTION_KEY');
    }
    return Buffer.from(ENCRYPTION_KEY, 'hex');
}

function hashSHA256(data: string): string {
    return crypto.createHmac('sha256', getKey()).update(data).digest('hex');
}

async function main() {
    const email = 'csanders0191@proton.me';
    const newPassword = 'password123';

    // Hash the email to find the record (or for the new record)
    const emailHash = hashSHA256(email.toLowerCase().trim());
    const passwordHash = await bcrypt.hash(newPassword, 12);

    try {
        // Try to update by EMAIL first (encupsulating the fix for the hash mismatch)
        const superAdmin = await prisma.superAdmin.upsert({
            where: { email },
            update: {
                emailHash, // Update to the correct hash
                passwordHash,
                active: true
            },
            create: {
                email,
                emailHash,
                name: 'Chris S.',
                passwordHash,
                active: true,
            }
        });

        console.log('\n========================================');
        console.log('  SUPER-ADMIN PASSWORD RESET SUCCESSFUL');
        console.log('========================================\n');
        console.log('  Email:', email);
        console.log('  Password:', newPassword);
        console.log('  (Updated emailHash to match HMAC-SHA256)');
        console.log('========================================\n');
    } catch (error) {
    } finally {
        await prisma.$disconnect();
    }
}

main();
