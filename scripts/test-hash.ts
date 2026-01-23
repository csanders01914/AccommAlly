import 'dotenv/config';
import crypto from 'crypto';

// Same logic as src/lib/encryption.ts
const rawKey = (process.env.ENCRYPTION_KEY || '').trim().replace(/^["']|["']$/g, '');
const ENCRYPTION_KEY = rawKey.substring(0, 64);

console.log('Raw env value length:', process.env.ENCRYPTION_KEY?.length);
console.log('Processed key length:', ENCRYPTION_KEY.length);
console.log('First 10 chars of key:', ENCRYPTION_KEY.substring(0, 10));

function getKey() {
    return Buffer.from(ENCRYPTION_KEY, 'hex');
}

function hash(text: string): string {
    return crypto.createHmac('sha256', getKey()).update(text).digest('hex');
}

const testEmail = 'test2@accessally.org';
console.log('\nTest email:', testEmail);
console.log('Hash:', hash(testEmail));
