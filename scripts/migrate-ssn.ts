
process.env.ENCRYPTION_KEY = "b8fe57c6c406205d1502421396245367b8fe57c6c406205d1502421396245367";
import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '../src/lib/encryption';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting SSN migration to split fields...');
    const cases = await prisma.case.findMany({
        where: {
            // Only migrate if we have an SSN but no prefix/suffix yet
            clientSSN: { not: null },
            OR: [
                { clientSSNPrefix: null },
                { clientSSNSuffix: null }
            ]
        }
    });

    console.log(`Found ${cases.length} cases to migrate.`);

    for (const c of cases) {
        if (!c.clientSSN) continue;

        try {
            const decrypted = decrypt(c.clientSSN);
            // clean: remove non-alphanumeric
            const clean = decrypted.replace(/[^a-zA-Z0-9]/g, '');

            if (clean.length < 5) {
                console.warn(`Case ${c.id}: SSN too short to split correctly (${clean}). Skipping safely.`);
                continue;
            }

            const prefix = clean.slice(0, 5); // First 5
            const suffix = clean.slice(5);    // Rest (usually 4)

            console.log(`Migrating Case ${c.id} (${c.caseNumber}): ${mask(prefix)}-${suffix}`);

            await prisma.case.update({
                where: { id: c.id },
                data: {
                    clientSSNPrefix: encrypt(prefix),
                    clientSSNSuffix: encrypt(suffix)
                }
            });

        } catch (error) {
            console.error(`Failed to migrate case ${c.id}:`, error);
        }
    }

    console.log('Migration complete.');
}

function mask(str: string) {
    return '*'.repeat(str.length);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
