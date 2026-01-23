
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import crypto from 'crypto';

// Re-implement encryption/hash logic to verify against DB values
const rawKey = (process.env.ENCRYPTION_KEY || '').trim().replace(/^["']|["']$/g, '');
const ENCRYPTION_KEY = rawKey.substring(0, 64);
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

function getKey() {
    return Buffer.from(ENCRYPTION_KEY, 'hex');
}

function decrypt(text: string): string {
    if (!text || !text.includes(':')) return text;
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift()!, 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        return `[Decrypt Error: ${text}]`;
    }
}

function hash(text: string): string {
    return crypto.createHmac('sha256', getKey())
        .update(text)
        .digest('hex');
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
    // console.log('--- DEBUG USER DATA ---');
    // console.log('Key length:', ENCRYPTION_KEY.length);
    // console.log('Key start:', ENCRYPTION_KEY.substring(0, 10) + '...');

    const users = await prisma.user.findMany();
    const results = [];
    for (const u of users) {
        // Decrypt email
        const decryptedEmail = decrypt(u.email);
        const expectedHash = hash(decryptedEmail);
        const match = u.emailHash === expectedHash;

        results.push({
            id: u.id,
            emailEncrypted: u.email.substring(0, 10) + '...',
            emailDecrypted: decryptedEmail,
            storedHash: u.emailHash,
            computedHash: expectedHash,
            match,
            role: u.role
        });
    }
    const fs = await import('fs');
    fs.writeFileSync('debug-users.json', JSON.stringify(results, null, 2));
    console.log('Wrote to debug-users.json');
}

main().catch(console.error).finally(() => prisma.$disconnect());
