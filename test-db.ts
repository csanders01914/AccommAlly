
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing DB connection...');
    try {
        // 1. Base Select
        console.log('1. Testing basic select (id only)...');
        const caseBasic = await prisma.case.findFirst({ select: { id: true, caseNumber: true } });
        console.log('   Success:', caseBasic?.caseNumber);

        // 2. Testing Relations One by One
        if (caseBasic) {
            // Accommodations
            console.log('2. Testing Accommodations relation...');
            await prisma.case.findUnique({ where: { id: caseBasic.id }, include: { accommodations: true } });
            console.log('   Success');

            // Claim Family
            console.log('3. Testing ClaimFamily relation...');
            await prisma.case.findUnique({ where: { id: caseBasic.id }, include: { claimFamily: true } });
            console.log('   Success');

            // Claimant
            console.log('4. Testing Claimant relation...');
            await prisma.case.findUnique({ where: { id: caseBasic.id }, include: { claimant: true } });
            console.log('   Success');
        }

        console.log('All individual tests passed. Retrying full fetch...');
        // Full Fetch
        const fullCase = await prisma.case.findFirst({
            include: {
                tasks: true,
                accommodations: true,
                notes: true,
                documents: true,
                contacts: true,
                client: true,
                claimant: true,
                claimFamily: true,
            }
        });
        console.log('Full fetch success');

    } catch (error) {
        console.error('Test Failed at step:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
