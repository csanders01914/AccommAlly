
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const INPUT_FILE = 'encrypted_message.txt';

function getKey() {
    // Try to get key from .env first
    let rawKey = process.env.ENCRYPTION_KEY || '';

    // Cleanup key
    rawKey = rawKey.trim().replace(/^["']|["']$/g, '');

    if (!rawKey || rawKey.length !== 64) {
        console.error(`[ERROR] Invalid ENCRYPTION_KEY in .env.`);
        console.error(`Current length: ${rawKey.length} (Expected 64 hex chars)`);
        console.error(`Please ensure your .env file has the ENCRYPTION_KEY set.`);
        process.exit(1);
    }
    return Buffer.from(rawKey, 'hex');
}

function decrypt(text: string, key: Buffer): string {
    if (!text || !text.includes(':')) {
        return `[ERROR] Invalid format. Text must contain ':' (IV separator).\nInput was: "${text.substring(0, 20)}..."`;
    }
    try {
        const textParts = text.split(':');
        const ivPart = textParts.shift();
        if (!ivPart) return '[ERROR] No IV found';

        const iv = Buffer.from(ivPart, 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');

        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString();
    } catch (error) {
        return `[DECRYPTION FAILED]: ${error instanceof Error ? error.message : String(error)}`;
    }
}

async function run() {
    console.log('--- File-Based Decryption Tool ---');

    const filePath = path.join(process.cwd(), INPUT_FILE);

    if (!fs.existsSync(filePath)) {
        console.error(`[ERROR] Could not find input file: ${INPUT_FILE}`);
        return;
    }

    const content = fs.readFileSync(filePath, 'utf-8').trim();

    // Filter out the placeholder text if user forgot to change it
    if (content.includes('PASTE_YOUR_ENCRYPTED_MESSAGE_HERE')) {
        console.error(`[ERROR] Please paste your encrypted message into ${INPUT_FILE} first!`);
        return;
    }

    console.log(`Reading from: ${INPUT_FILE}`);
    console.log(`Input Length: ${content.length} chars`);

    const key = getKey();
    const result = decrypt(content, key);

    console.log('\n--- Decrypted Message ---');
    console.log(result);
    console.log('-------------------------');
}

run();
