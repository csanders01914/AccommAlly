
import { PrismaClient } from '@prisma/client';
import { hash, decrypt } from '../src/lib/encryption';
import { comparePassword } from '../src/lib/auth';
import * as fs from 'fs';
import * as path from 'path';

// Load env manually
const envPath = path.join(process.cwd(), '.env');
console.log('Loading .env from:', envPath);
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} else {
    console.error('ERROR: .env file not found!');
}

console.log('DATABASE_URL defined:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace('sslmode=verify-full', 'sslmode=require');
    console.log('Downgraded SSL mode to require for debug script');
}
console.log('ENCRYPTION_KEY defined:', !!process.env.ENCRYPTION_KEY);

const prisma = new PrismaClient();

async function main() {
    console.log('--- Login Debug Script ---');

    // 1. Check Encryption Key
    console.log('Encryption Key Length:', (process.env.ENCRYPTION_KEY || '').length);

    // 2. List Users (Regular)
    console.log('\n--- Checking Users (Top 5) ---');
    const users = await prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, emailHash: true, name: true, createdAt: true }
    });

    for (const u of users) {
        const computedHash = hash(u.email.toLowerCase().trim());
        const match = computedHash === u.emailHash;
        console.log(`\nUser: ${u.email}`);
        console.log(`  Stored Hash:   ${u.emailHash}`);
        console.log(`  Computed Hash: ${computedHash}`);
        console.log(`  Match?         ${match ? 'YES' : 'NO'}`);

        if (!match) {
            console.warn('  WARNING: Hash mismatch! This user cannot log in.');
        }
    }

    // 3. Decrypt Debug Log if exists
    const logPath = path.join(process.cwd(), 'login-debug.txt');
    if (fs.existsSync(logPath)) {
        console.log('\n--- Decrypting Login Debug Log ---');
        const content = fs.readFileSync(logPath, 'utf-8');
        const lines = content.split('\n').filter(Boolean);

        // Read last 20 lines
        const lastLines = lines.slice(-20);

        lastLines.forEach(line => {
            try {
                const decrypted = decrypt(line);
                console.log(decrypted);
            } catch (e) {
                console.log('(Failed to decrypt line)');
            }
        });
    } else {
        console.log('\nNo login-debug.txt found.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
