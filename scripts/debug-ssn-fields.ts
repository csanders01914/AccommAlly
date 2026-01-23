
process.env.ENCRYPTION_KEY = "b8fe57c6c406205d1502421396245367b8fe57c6c406205d1502421396245367";
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

let cachedKey: Buffer | null = null;
const IV_LENGTH = 16;

function getKey() {
    if (cachedKey) return cachedKey;
    const rawKey = (process.env.ENCRYPTION_KEY || '').trim();
    const ENCRYPTION_KEY = rawKey.substring(0, 64);

    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
        throw new Error('Invalid ENCRYPTION_KEY');
    }

    cachedKey = Buffer.from(ENCRYPTION_KEY, 'hex');
    return cachedKey;
}

function decrypt(text: string): string {
    if (!text) return text;
    try {
        const textParts = text.split(':');
        const ivPart = textParts.shift();
        if (!ivPart) return text;
        const iv = Buffer.from(ivPart, 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', getKey(), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        return text;
    }
}

const prisma = new PrismaClient();

async function main() {
    const cases = await prisma.case.findMany({
        take: 5,
        select: {
            id: true,
            caseNumber: true,
            clientSSN: true,
            clientSSNSuffix: true
        }
    });

    console.log('Found cases:', cases.length);

    for (const c of cases) {
        console.log(`Case ${c.caseNumber} (${c.id})`);

        // Check Legacy
        console.log(`  Legacy SSN Raw: ${c.clientSSN ? 'Present' : 'Null'}`);
        if (c.clientSSN) {
            try {
                const dec = decrypt(c.clientSSN);
                console.log(`  Legacy Decrypted: ${dec}`);
            } catch (e) {
                console.error(`  Legacy Decryption failed:`, e);
            }
        }

        // Check Suffix
        console.log(`  SSN Suffix Raw: ${c.clientSSNSuffix ? 'Present' : 'Null'}`);
        if (c.clientSSNSuffix) {
            try {
                const dec = decrypt(c.clientSSNSuffix);
                console.log(`  Suffix Decrypted: ${dec}`);
            } catch (e) {
                console.error(`  Suffix Decryption failed:`, e);
            }
        }

        console.log('---');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
