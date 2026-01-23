
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching all cases...');
    const cases = await prisma.case.findMany({
        select: { id: true, caseNumber: true, clientName: true }
    });

    console.log(`Found ${cases.length} cases.`);

    for (const c of cases) {
        console.log(`Checking Case: ${c.caseNumber} (ID: "${c.id}")`);

        // Check lengths
        if (c.id.trim() !== c.id) {
            console.error(`Status: ID has whitespace! "${c.id}"`);
        }

        const found = await prisma.case.findUnique({
            where: { id: c.id }
        });

        if (found) {
            console.log(`  Status: OK (Found via findUnique)`);
        } else {
            console.error(`  Status: FAILED (Not found via findUnique with exact ID)`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
